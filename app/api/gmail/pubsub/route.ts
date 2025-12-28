import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { env } from "@/lib/env";
import { getGoogleAccount } from "@/lib/db";
import { getDecryptedTokens, refreshIfNeeded, listHistory, fetchMessage, decodeBody, getProfile, searchMessages, setEncryptedTokens } from "@/lib/gmail";
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

export async function POST(request: Request) {
  const token = request.headers.get("x-pubsub-token");
  if (!token || token !== process.env.PUBSUB_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const rawData = payload.message?.data;
  if (!rawData) {
    return NextResponse.json({ ok: true });
  }

  const decoded = JSON.parse(Buffer.from(rawData, "base64").toString("utf8"));
  const historyId = decoded.historyId?.toString();
  const account = await getGoogleAccount();

  if (!account || !historyId) {
    return NextResponse.json({ ok: true });
  }

  const supabase = getSupabaseServerClient();
  const tokens = getDecryptedTokens(account);
  const refreshed = await refreshIfNeeded(tokens);
  if (refreshed.access_token !== tokens.access_token || refreshed.expiry_date !== tokens.expiry_date) {
    const encrypted = setEncryptedTokens(refreshed);
    await supabase.from("google_accounts").update(encrypted).eq("id", account.id);
  }

  let latestHistoryId = historyId;
  try {
    const history = await withBackoff(() =>
      listHistory({ accessToken: refreshed.access_token, startHistoryId: account.last_history_id?.toString() ?? historyId })
    );
    const messageIds = new Set<string>();
    for (const item of history.history ?? []) {
      for (const message of item.messages ?? []) {
        if (message.id) messageIds.add(message.id);
      }
    }

    for (const id of messageIds) {
      const message = await withBackoff(() =>
        fetchMessage({ accessToken: refreshed.access_token, messageId: id })
      );
      await ingestMessage(message);
    }

    if (history.historyId) {
      latestHistoryId = history.historyId.toString();
    }
  } catch (error: any) {
    const errorMessage = error?.message ?? "";
    if (errorMessage.includes("History Id") || errorMessage.includes("not found")) {
      const searchQuery = `${account.gmail_query ?? ""} newer_than:14d`;
      const messages = await withBackoff(() =>
        searchMessages({ accessToken: refreshed.access_token, query: searchQuery })
      );
      for (const message of messages) {
        if (!message.id) continue;
        const full = await withBackoff(() =>
          fetchMessage({ accessToken: refreshed.access_token, messageId: message.id! })
        );
        await ingestMessage(full);
      }
      const profile = await getProfile(refreshed.access_token);
      latestHistoryId = profile.historyId?.toString() ?? latestHistoryId;
    } else {
      throw error;
    }
  }

  await supabase.from("google_accounts").update({
    last_history_id: latestHistoryId,
    updated_at: new Date().toISOString()
  }).eq("id", account.id);

  if (account.auto_extract) {
    await fetch(new URL("/api/extract/run", env.appBaseUrl()), { method: "POST" });
  }

  return NextResponse.json({ ok: true });
}
