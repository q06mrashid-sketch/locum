import { NextResponse } from "next/server";
import { getGoogleAccount } from "@/lib/db";
import { getDecryptedTokens, refreshIfNeeded, setEncryptedTokens, fetchMessage, searchMessages, decodeBody, getProfile } from "@/lib/gmail";
import { getSupabaseServerClient } from "@/lib/supabase";
import { hashContent } from "@/lib/hash";
import { withBackoff } from "@/lib/backoff";

function getHeader(headers: { name?: string; value?: string }[], name: string) {
  return headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? null;
}

async function ingestMessage(message: any) {
  const headers = message.payload?.headers ?? [];
  const subject = getHeader(headers, "Subject");
  const from = getHeader(headers, "From");
  const date = getHeader(headers, "Date");
  const body = decodeBody(message.payload);
  const content = [subject, from, date, body].filter(Boolean).join("\n");
  const contentHash = hashContent(content);

  const supabase = getSupabaseServerClient();
  await supabase.from("raw_items").upsert({
    source: "gmail",
    external_id: message.id,
    received_at: message.internalDate
      ? new Date(Number(message.internalDate)).toISOString()
      : new Date().toISOString(),
    content_text: body || subject || "(no content)",
    content_meta: { subject, from, date },
    content_hash: contentHash
  });
}

export async function POST() {
  const account = await getGoogleAccount();
  if (!account) {
    return NextResponse.json({ error: "No account" }, { status: 404 });
  }

  const supabase = getSupabaseServerClient();
  const tokens = getDecryptedTokens(account);
  const refreshed = await refreshIfNeeded(tokens);
  if (refreshed.access_token !== tokens.access_token || refreshed.expiry_date !== tokens.expiry_date) {
    await supabase.from("google_accounts").update(setEncryptedTokens(refreshed)).eq("id", account.id);
  }

  const query = account.gmail_query ?? "newer_than:30d";
  const messages = await withBackoff(() =>
    searchMessages({ accessToken: refreshed.access_token, query })
  );

  for (const message of messages) {
    if (!message.id) continue;
    const full = await withBackoff(() =>
      fetchMessage({ accessToken: refreshed.access_token, messageId: message.id! })
    );
    await ingestMessage(full);
  }

  const profile = await getProfile(refreshed.access_token);
  await supabase.from("google_accounts").update({
    last_history_id: profile.historyId ?? account.last_history_id,
    updated_at: new Date().toISOString()
  }).eq("id", account.id);

  return NextResponse.json({ ok: true, ingested: messages.length });
}
