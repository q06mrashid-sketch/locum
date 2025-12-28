import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("google_accounts")
    .select(
      "google_email, watch_expiration, last_history_id, gmail_query, auto_extract"
    )
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return NextResponse.json({ status: data });
}
