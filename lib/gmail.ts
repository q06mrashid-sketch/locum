import { google } from "googleapis";
import { env } from "./env";
import { decrypt, encrypt } from "./crypto";

export type GoogleTokens = {
  access_token: string;
  refresh_token?: string | null;
  expiry_date?: number | null;
};

export function getOAuthClient() {
  return new google.auth.OAuth2(
    env.googleClientId(),
    env.googleClientSecret(),
    env.googleRedirectUri()
  );
}

export function getAuthUrl(state: string) {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/userinfo.email"
    ],
    state
  });
}

export function setEncryptedTokens(tokens: GoogleTokens) {
  return {
    access_token: encrypt(tokens.access_token),
    refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
    token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
  };
}

export function getDecryptedTokens(record: {
  access_token: string;
  refresh_token: string | null;
  token_expiry: string | null;
}) {
  return {
    access_token: decrypt(record.access_token),
    refresh_token: record.refresh_token ? decrypt(record.refresh_token) : null,
    expiry_date: record.token_expiry ? new Date(record.token_expiry).getTime() : null
  } satisfies GoogleTokens;
}

export async function getAuthorizedClient(tokens: GoogleTokens) {
  const client = getOAuthClient();
  client.setCredentials(tokens);
  return client;
}

export async function refreshIfNeeded(tokens: GoogleTokens) {
  if (!tokens.expiry_date || tokens.expiry_date > Date.now() + 60_000) {
    return tokens;
  }
  const client = getOAuthClient();
  client.setCredentials(tokens);
  const refreshed = await client.refreshAccessToken();
  const creds = refreshed.credentials;
  return {
    access_token: creds.access_token ?? tokens.access_token,
    refresh_token: creds.refresh_token ?? tokens.refresh_token,
    expiry_date: creds.expiry_date ?? tokens.expiry_date
  } satisfies GoogleTokens;
}

export async function startWatch({
  accessToken,
  emailAddress,
  labelIds,
  topicName
}: {
  accessToken: string;
  emailAddress: string;
  labelIds: string[];
  topicName: string;
}) {
  const oauth = getOAuthClient();
  oauth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: oauth });
  const response = await gmail.users.watch({
    userId: "me",
    requestBody: {
      labelIds,
      topicName
    }
  });
  return response.data;
}

export async function getProfile(accessToken: string) {
  const oauth = getOAuthClient();
  oauth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: oauth });
  const profile = await gmail.users.getProfile({ userId: "me" });
  return profile.data;
}

export async function listHistory({
  accessToken,
  startHistoryId
}: {
  accessToken: string;
  startHistoryId: string;
}) {
  const oauth = getOAuthClient();
  oauth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: oauth });
  const history = await gmail.users.history.list({
    userId: "me",
    startHistoryId,
    historyTypes: ["messageAdded", "messageDeleted", "messageLabelAdded"]
  });
  return history.data;
}

export async function searchMessages({
  accessToken,
  query
}: {
  accessToken: string;
  query: string;
}) {
  const oauth = getOAuthClient();
  oauth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: oauth });
  const res = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 50
  });
  return res.data.messages ?? [];
}

export async function fetchMessage({
  accessToken,
  messageId
}: {
  accessToken: string;
  messageId: string;
}) {
  const oauth = getOAuthClient();
  oauth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: oauth });
  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full"
  });
  return res.data;
}

export function decodeBody(payload: any): string {
  if (!payload) return "";
  if (payload.body?.data) {
    const normalized = payload.body.data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(normalized, "base64").toString("utf8");
  }
  if (payload.parts) {
    return payload.parts.map(decodeBody).join("\n");
  }
  return "";
}
