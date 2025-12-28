export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const env = {
  supabaseUrl: () => requireEnv("SUPABASE_URL"),
  supabaseServiceRoleKey: () => requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  openaiApiKey: () => requireEnv("OPENAI_API_KEY"),
  googleClientId: () => requireEnv("GOOGLE_CLIENT_ID"),
  googleClientSecret: () => requireEnv("GOOGLE_CLIENT_SECRET"),
  googleRedirectUri: () => requireEnv("GOOGLE_REDIRECT_URI"),
  pubsubToken: () => requireEnv("PUBSUB_TOKEN"),
  appBaseUrl: () => requireEnv("APP_BASE_URL"),
  encryptionKey: () => requireEnv("APP_ENCRYPTION_KEY")
};
