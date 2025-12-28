import { NextResponse } from "next/server";
import { parseWhatsAppExport } from "@/lib/whatsapp";
import { hashContent } from "@/lib/hash";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const messages = parseWhatsAppExport(body.text);
  const supabase = getSupabaseServerClient();

  for (const message of messages) {
    const contentHash = hashContent(`${message.timestamp ?? ""}-${message.author ?? ""}-${message.message}`);
    await supabase.from("raw_items").upsert({
      source: "whatsapp",
      external_id: contentHash,
      received_at: message.timestamp ? message.timestamp.toISOString() : new Date().toISOString(),
      content_text: message.message,
      content_meta: {
        author: message.author,
        is_system: message.isSystem
      },
      content_hash: contentHash
    });
  }

  return NextResponse.json({ ok: true, count: messages.length });
}
