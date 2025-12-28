import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthUrl } from "@/lib/gmail";

export async function GET() {
  const state = crypto.randomBytes(12).toString("hex");
  const url = getAuthUrl(state);
  return NextResponse.redirect(url);
}
