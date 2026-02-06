import { NextRequest, NextResponse } from "next/server";

const VPS_KEY = process.env.OPENCLAW_VPS_API_KEY!;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${VPS_KEY}`) return unauthorized();

  const body = (await req.json()) as {
    userId?: string;
    telegramBotToken?: string;
    model?: string;
    [key: string]: unknown;
  };
  const { userId, telegramBotToken, model } = body;

  console.log("🚀 Create agent:", { userId, telegramBotToken, model });

  // TEMP: we just confirm endpoint works first
  return NextResponse.json({
    success: true,
    message: "Agent registered on VPS",
    userId,
  });
}

export async function DELETE(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${VPS_KEY}`) return unauthorized();

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");

  console.log("🗑 Delete agent:", userId);

  return NextResponse.json({
    success: true,
    message: "Agent deleted",
    userId,
  });
}