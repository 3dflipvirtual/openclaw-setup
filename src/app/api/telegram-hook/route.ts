import { NextRequest, NextResponse } from "next/server";

const MINIMAX_KEY = process.env.PLATFORM_MINIMAX_API_KEY!;

async function askMiniMax(message: string) {
  const res = await fetch("https://api.minimax.chat/v1/text/chatcompletion_v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MINIMAX_KEY}`,
    },
    body: JSON.stringify({
      model: "abab6.5s-chat",
      messages: [
        { role: "system", content: "You are a helpful AI assistant." },
        { role: "user", content: message },
      ],
    }),
  });

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content || "No response.";
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

  const reply = await askMiniMax(text);

  console.log("🤖 Reply:", reply);

  await sendTelegram(chatId, reply, botToken);

  return NextResponse.json({ ok: true });
}
