import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getGoogleAccount } from "@/lib/db";
import { getDecryptedTokens, refreshIfNeeded, setEncryptedTokens, startWatch } from "@/lib/gmail";
import { getSupabaseServerClient } from "@/lib/supabase";

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

  const oauth = new google.auth.OAuth2();
  oauth.setCredentials({ access_token: refreshed.access_token });
  const gmail = google.gmail({ version: "v1", auth: oauth });
  const labels = await gmail.users.labels.list({ userId: "me" });
  const hasLocumLabel = labels.data.labels?.some(
    (label) => label.name?.toLowerCase() === "locum"
  );
  const labelIds = hasLocumLabel ? ["INBOX", "Locum"] : ["INBOX"];

  const watch = await startWatch({
    accessToken: refreshed.access_token,
    emailAddress: account.google_email,
    labelIds,
    topicName: process.env.GMAIL_PUBSUB_TOPIC ?? ""
  });

  await supabase.from("google_accounts").update({
    watch_expiration: watch.expiration
      ? new Date(Number(watch.expiration)).toISOString()
      : null,
    last_history_id: watch.historyId ?? account.last_history_id,
    updated_at: new Date().toISOString()
  }).eq("id", account.id);

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return POST();
}
