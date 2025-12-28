import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("shift_offers")
    .select("*")
    .order("date", { ascending: true })
    .limit(200);

  if (error) throw error;
  return NextResponse.json({ offers: data ?? [] });
}
