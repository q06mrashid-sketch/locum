import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { fillTemplate } from "@/lib/templates";

function buildPayload(offer: any) {
  return {
    date: offer.date,
    practice_name: offer.practice_name,
    town: offer.town,
    postcode: offer.postcode,
    rate_value: offer.rate_value?.toString() ?? "",
    rate_unit: offer.rate_unit,
    start_time: offer.start_time,
    end_time: offer.end_time,
    agency: offer.agency
  };
}

async function getTemplate(channel: "email" | "whatsapp", agency?: string | null) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("booking_templates")
    .select("*")
    .eq("channel", channel)
    .in("agency", [agency ?? "", "default"])
    .order("agency", { ascending: true });

  return data?.find((item) => item.agency === agency) ?? data?.[0];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type");
  if (!id || (type !== "email" && type !== "whatsapp")) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data: offer } = await supabase
    .from("shift_offers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!offer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const template = await getTemplate(type, offer.agency);
  const payload = buildPayload(offer);

  if (type === "email") {
    const subject = fillTemplate(template?.subject_template ?? "Locum booking request", payload);
    const body = fillTemplate(template?.body_template ?? "", payload);
    const url = `mailto:${encodeURIComponent(offer.booking_target ?? "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return NextResponse.redirect(url);
  }

  const message = fillTemplate(template?.body_template ?? "", payload);
  const phone = offer.booking_target?.replace(/[^0-9]/g, "") ?? "";
  const base = phone ? `https://wa.me/${phone}` : "https://wa.me/";
  const url = `${base}?text=${encodeURIComponent(message)}`;
  return NextResponse.redirect(url);
}
