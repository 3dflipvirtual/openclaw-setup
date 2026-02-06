import { NextRequest, NextResponse } from "next/server";

const VPS_KEY = process.env.OPENCLAW_VPS_API_KEY!;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${VPS_KEY}`) return unauthorized();

  const body = await req.json();

  console.log("📩 Telegram message received:", body);

  // TEMP: just confirm webhook works
  return NextResponse.json({ ok: true });
}