import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("shift_offers")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", body.id);

  if (error) throw error;
  return NextResponse.json({ ok: true });
}
