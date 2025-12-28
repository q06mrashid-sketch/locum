import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { extractOffers, buildFingerprint, Offer } from "@/lib/extract";

async function withExtractionGuard() {
  const supabase = getSupabaseServerClient();
  const { data: account } = await supabase
    .from("google_accounts")
    .select("id, extraction_running")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!account) return { supabase, account: null, locked: false };

  if (account.extraction_running) {
    return { supabase, account, locked: true };
  }

  await supabase
    .from("google_accounts")
    .update({ extraction_running: true })
    .eq("id", account.id);

  return { supabase, account, locked: false };
}

async function releaseGuard(supabase: ReturnType<typeof getSupabaseServerClient>, accountId?: string) {
  if (!accountId) return;
  await supabase.from("google_accounts").update({ extraction_running: false }).eq("id", accountId);
}

async function upsertOffer(supabase: ReturnType<typeof getSupabaseServerClient>, offer: Offer, rawId: string) {
  const fingerprint = buildFingerprint(offer);
  const { data: existing } = await supabase
    .from("shift_offers")
    .select("id, source_raw_ids, confidence")
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  const mergedSourceIds = existing?.source_raw_ids
    ? Array.from(new Set([...(existing.source_raw_ids ?? []), rawId]))
    : [rawId];

  const payload = {
    date: offer.date,
    start_time: offer.start_time ?? null,
    end_time: offer.end_time ?? null,
    rate_value: offer.rate_value ?? null,
    rate_unit: offer.rate_unit ?? null,
    practice_name: offer.practice_name ?? null,
    postcode: offer.postcode ?? null,
    town: offer.town ?? null,
    agency: offer.agency ?? null,
    booking_channel: offer.booking_channel,
    booking_target: offer.booking_target ?? null,
    notes: offer.notes ?? null,
    confidence: Math.max(existing?.confidence ?? 0, offer.confidence),
    fingerprint,
    source_raw_ids: mergedSourceIds,
    updated_at: new Date().toISOString()
  };

  if (existing) {
    await supabase.from("shift_offers").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("shift_offers").insert(payload);
  }
}

export async function POST() {
  const { supabase, account, locked } = await withExtractionGuard();
  if (locked) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const { data: items } = await supabase
      .from("raw_items")
      .select("id, content_text, content_meta")
      .eq("extracted", false)
      .limit(20);

    if (!items || items.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    let processed = 0;
    for (const item of items) {
      const composed = [
        item.content_text,
        item.content_meta ? JSON.stringify(item.content_meta) : ""
      ]
        .filter(Boolean)
        .join("\n");
      const extraction = await extractOffers(composed);
      for (const offer of extraction.offers) {
        if (!offer.date) continue;
        await upsertOffer(supabase, offer, item.id);
      }
      await supabase.from("raw_items").update({ extracted: true }).eq("id", item.id);
      processed += 1;
    }

    return NextResponse.json({ ok: true, processed });
  } finally {
    await releaseGuard(supabase, account?.id);
  }
}
