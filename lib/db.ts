import { getSupabaseServerClient } from "./supabase";

export async function getOrCreateAdminUser(email?: string | null) {
  const supabase = getSupabaseServerClient();
  const { data: existing } = await supabase
    .from("app_users")
    .select("*")
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase
    .from("app_users")
    .insert({ email })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getGoogleAccount() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("google_accounts")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
