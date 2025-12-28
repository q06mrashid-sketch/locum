import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getOAuthClient, setEncryptedTokens, startWatch } from "@/lib/gmail";
import { env } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getOrCreateAdminUser } from "@/lib/db";

const DEFAULT_QUERY =
  "newer_than:30d (locum OR shift OR cover OR booking OR rate OR \"£\")";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) {
    return NextResponse.json({ error: "Missing access token" }, { status: 400 });
  }

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  client.setCredentials(tokens);
  const profile = await oauth2.userinfo.get();
  const email = profile.data.email ?? "";

  const supabase = getSupabaseServerClient();
  const user = await getOrCreateAdminUser(email);

  const encrypted = setEncryptedTokens({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    expiry_date: tokens.expiry_date ?? null
  });

  const existing = await supabase
    .from("google_accounts")
    .select("id, gmail_query")
    .eq("app_user_id", user.id)
    .maybeSingle();

  const { data: saved, error } = await supabase
    .from("google_accounts")
    .upsert({
      id: existing.data?.id,
      app_user_id: user.id,
      google_email: email,
      ...encrypted,
      gmail_query: existing.data?.gmail_query ?? DEFAULT_QUERY,
      updated_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) throw error;

  const gmail = google.gmail({ version: "v1", auth: client });
  const labels = await gmail.users.labels.list({ userId: "me" });
  const hasLocumLabel = labels.data.labels?.some(
    (label) => label.name?.toLowerCase() === "locum"
  );
  const labelIds = hasLocumLabel ? ["INBOX", "Locum"] : ["INBOX"];

  const watch = await startWatch({
    accessToken: tokens.access_token,
    emailAddress: email,
    labelIds,
    topicName: process.env.GMAIL_PUBSUB_TOPIC ?? ""
  });

  await supabase
    .from("google_accounts")
    .update({
      watch_expiration: watch.expiration
        ? new Date(Number(watch.expiration)).toISOString()
        : null,
      last_history_id: watch.historyId ?? saved.last_history_id,
      updated_at: new Date().toISOString()
    })
    .eq("id", saved.id);

  return NextResponse.redirect(new URL("/settings", env.appBaseUrl()));
}
