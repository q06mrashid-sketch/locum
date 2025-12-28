import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();
  const supabase = getSupabaseServerClient();
  const { data: account, error } = await supabase
    .from("google_accounts")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !account) {
    return NextResponse.json({ error: "No Google account" }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("google_accounts")
    .update({
      gmail_query: body.gmail_query,
      auto_extract: Boolean(body.auto_extract),
      updated_at: new Date().toISOString()
    })
    .eq("id", account.id);

  if (updateError) throw updateError;
  return NextResponse.json({ ok: true });
}
