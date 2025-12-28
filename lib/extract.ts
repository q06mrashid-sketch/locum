import OpenAI from "openai";
import { z } from "zod";
import { env } from "./env";

const OfferSchema = z.object({
  date: z.string(),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  rate_value: z.number().nullable().optional(),
  rate_unit: z.enum(["per_day", "per_hour"]).nullable().optional(),
  practice_name: z.string().nullable().optional(),
  postcode: z.string().nullable().optional(),
  town: z.string().nullable().optional(),
  agency: z.string().nullable().optional(),
  booking_channel: z.enum(["email", "whatsapp", "unknown"]),
  booking_target: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1)
});

const ExtractionSchema = z.object({
  offers: z.array(OfferSchema)
});

const systemPrompt = `You extract locum shift offers from raw messages.\nReturn JSON only with schema: {"offers":[{...}]}.\nRules:\n- date must be YYYY-MM-DD to create an offer.\n- start_time/end_time must be HH:MM 24h or null.\n- rate_value numeric or null.\n- rate_unit must be per_day|per_hour|null.\n- practice_name/postcode/town/agency/booking_target/notes may be null.\n- booking_channel must be email|whatsapp|unknown.\n- confidence 0..1.\n- Do not hallucinate missing info. Use null + lower confidence.`;

export async function extractOffers(text: string) {
  const client = new OpenAI({ apiKey: env.openaiApiKey() });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text }
    ],
    temperature: 0.2
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON from OpenAI: ${raw}`);
  }
  return ExtractionSchema.parse(parsed);
}

export function buildFingerprint(offer: z.infer<typeof OfferSchema>) {
  return [
    offer.date,
    offer.start_time ?? "",
    offer.postcode ?? "",
    offer.practice_name ?? "",
    offer.rate_value ?? "",
    offer.agency ?? ""
  ].join("|");
}

export type Offer = z.infer<typeof OfferSchema>;
