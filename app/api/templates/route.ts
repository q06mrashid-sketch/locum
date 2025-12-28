import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("booking_templates")
    .select("*")
    .order("channel", { ascending: true });

  if (error) throw error;
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  const supabase = getSupabaseServerClient();
  const templates = body.templates ?? [];

  for (const template of templates) {
    await supabase.from("booking_templates").upsert({
      id: template.id,
      agency: template.agency,
      channel: template.channel,
      subject_template: template.subject_template,
      body_template: template.body_template
    });
  }

  return NextResponse.json({ ok: true });
}
