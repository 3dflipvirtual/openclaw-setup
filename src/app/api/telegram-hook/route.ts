import { NextRequest, NextResponse } from "next/server";

async function askAI(message: string) {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
      process.env.GEMINI_API_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: message }],
          },
        ],
      }),
    }
  );

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  console.log("GEMINI RAW:", JSON.stringify(data));

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Gemini returned nothing."
  );
}

async function sendTelegram(chatId: number, text: string, botToken: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
}

export async function POST(req: NextRequest) {
  const update = (await req.json()) as {
    message?: { chat: { id: number }; text?: string };
  };

  if (!update.message) return NextResponse.json({ ok: true });

  const chatId = update.message.chat.id;
  const text = update.message.text || "";

  // TEMP: single test bot token (we generalize after)
  const botToken = process.env.TEST_TELEGRAM_BOT_TOKEN!;

  console.log("📩 Message:", text);

  const reply = await askAI(text);

  console.log("🤖 Reply:", reply);

  await sendTelegram(chatId, reply, botToken);

  return NextResponse.json({ ok: true });
}
