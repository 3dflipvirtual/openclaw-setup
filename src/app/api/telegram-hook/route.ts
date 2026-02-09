import { NextRequest, NextResponse } from "next/server";

import { decryptSecret } from "@/lib/crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const RATE_LIMIT = {
  perChat: { limit: 10, windowSeconds: 60 },
  perUser: { limit: 30, windowSeconds: 60 },
};

type AgentMessage = {
  role: "user" | "assistant";
  content: string;
};

const SHORT_TERM_LIMIT = 20;
const LONG_TERM_LIMIT = 20;

async function checkRateLimit(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  key: string,
  limit: number,
  windowSeconds: number
) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);
  const { data: existing } = await supabase
    .from("rate_limits")
    .select("count, window_start")
    .eq("key", key)
    .maybeSingle();
  if (!existing || new Date(existing.window_start) < windowStart) {
    await supabase.from("rate_limits").upsert({
      key,
      window_start: now.toISOString(),
      count: 1,
    });
    return true;
  }
  if (existing.count >= limit) return false;
  await supabase.from("rate_limits").update({ count: existing.count + 1 }).eq("key", key);
  return true;
}

async function askAI(system: string, messages: AgentMessage[]) {
  const res = await fetch("https://api.minimax.io/anthropic/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PLATFORM_MINIMAX_API_KEY}`,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "MiniMax-M2.1",
      max_tokens: 200,
      temperature: 0.7,
      system,
      messages,
    }),
  });

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  console.log("MINIMAX RAW:", JSON.stringify(data));

  return (
    data?.content?.find((c) => c.type === "text")?.text ||
    "MiniMax returned nothing."
  );
}

async function extractMemory(text: string): Promise<string | null> {
  if (!text.trim()) return null;

  const res = await fetch("https://api.minimax.io/anthropic/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PLATFORM_MINIMAX_API_KEY}`,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "MiniMax-M2.1",
      max_tokens: 128,
      temperature: 0,
      system:
        "Extract important long-term facts about the user from the text. " +
        "Return 'none' if there are no important long-term facts.",
      messages: [
        {
          role: "user",
          content: text,
        },
      ],
    }),
  });

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const extracted =
    data?.content?.find((c) => c.type === "text")?.text?.trim() ?? "none";

  if (!extracted || extracted.toLowerCase() === "none") return null;
  return extracted;
}

async function extractGoal(text: string): Promise<string | null> {
  if (!text.trim()) return null;

  const res = await fetch("https://api.minimax.io/anthropic/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PLATFORM_MINIMAX_API_KEY}`,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "MiniMax-M2.1",
      max_tokens: 96,
      temperature: 0,
      system:
        "The user is talking to an autonomous assistant.\n" +
        "From the following conversation, infer the user's main ongoing goal as one short sentence.\n" +
        "If there is no clear ongoing goal, return exactly 'none'.",
      messages: [
        {
          role: "user",
          content: text,
        },
      ],
    }),
  });

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const extracted =
    data?.content?.find((c) => c.type === "text")?.text?.trim() ?? "none";

  if (!extracted || extracted.toLowerCase() === "none") return null;
  return extracted;
}

async function sendTelegram(chatId: number, text: string, botToken: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API ${res.status}: ${body.slice(0, 200)}`);
  }
}

async function getShortTermMemory(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  agentId: string
): Promise<AgentMessage[]> {
  const { data } = await supabase
    .from("agent_memory")
    .select("role, content")
    .eq("user_id", userId)
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(SHORT_TERM_LIMIT);

  if (!data || data.length === 0) return [];

  return data
    .map((row) => ({
      role: (row.role as "user" | "assistant") ?? "user",
      content: row.content as string,
    }))
    .reverse();
}

async function saveShortTermMemory(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  agentId: string,
  userMessage: string,
  assistantReply: string
) {
  const rows = [
    {
      user_id: userId,
      agent_id: agentId,
      role: "user",
      content: userMessage,
    },
    {
      user_id: userId,
      agent_id: agentId,
      role: "assistant",
      content: assistantReply,
    },
  ];

  await supabase.from("agent_memory").insert(rows);
}

async function getLongTermMemory(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  agentId: string
): Promise<string> {
  const { data } = await supabase
    .from("agent_long_memory")
    .select("content")
    .eq("user_id", userId)
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(LONG_TERM_LIMIT);

  if (!data || data.length === 0) return "";

  return data
    .map((row) => row.content as string)
    .filter(Boolean)
    .reverse()
    .join("\n- ");
}

async function saveLongTermMemory(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  agentId: string,
  content: string
) {
  if (!content.trim()) return;
  await supabase.from("agent_long_memory").insert({
    user_id: userId,
    agent_id: agentId,
    content,
  });
}

async function saveGoal(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  agentId: string,
  goal: string
) {
  if (!goal.trim()) return;

  // Keep it simple: insert new active goal. You could also deactivate previous ones here.
  await supabase.from("agent_goals").insert({
    user_id: userId,
    agent_id: agentId,
    goal,
    active: true,
  });
}

async function getActiveGoal(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  agentId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("agent_goals")
    .select("goal")
    .eq("user_id", userId)
    .eq("agent_id", agentId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .maybeSingle();

  return (data?.goal as string) ?? null;
}

export async function POST(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (!secret) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminSupabaseClient();
  const { data: link } = await admin
    .from("telegram_links")
    .select("user_id, bot_token_encrypted")
    .eq("webhook_secret", secret)
    .maybeSingle();

  if (!link?.bot_token_encrypted) {
    return NextResponse.json({ ok: true });
  }

  let botToken: string;
  try {
    botToken = decryptSecret(link.bot_token_encrypted);
  } catch (err) {
    console.error("[telegram-hook] decrypt failed", { userId: link.user_id });
    return NextResponse.json({ ok: true });
  }

  const update = (await req.json()) as {
    message?: { chat: { id: number }; text?: string };
  };

  if (!update.message) return NextResponse.json({ ok: true });

  const chatId = update.message.chat.id;
  const text = update.message.text || "";

  const chatKey = `telegram-hook:chat:${chatId}`;
  const userKey = `telegram-hook:user:${link.user_id}`;
  const chatOk = await checkRateLimit(
    admin,
    chatKey,
    RATE_LIMIT.perChat.limit,
    RATE_LIMIT.perChat.windowSeconds
  );
  const userOk = await checkRateLimit(
    admin,
    userKey,
    RATE_LIMIT.perUser.limit,
    RATE_LIMIT.perUser.windowSeconds
  );
  if (!chatOk || !userOk) {
    try {
      await sendTelegram(chatId, "Rate limit. Please wait a moment.", botToken);
    } catch {
      // ignore
    }
    return NextResponse.json({ ok: true });
  }

  console.log("[telegram-hook] message", {
    chatId,
    userId: link.user_id,
    text: text.slice(0, 80),
  });

  const agentId = botToken; // each Telegram bot = one autonomous agent
  let justInferredGoal: string | null = null;

  // Goal command: "/goal your goal text"
  if (text.startsWith("/goal ")) {
    const goalText = text.slice("/goal ".length).trim();
    if (goalText) {
      try {
        await saveGoal(admin, link.user_id, agentId, goalText);
        await sendTelegram(chatId, "Goal saved.", botToken);
      } catch (err) {
        console.error("[telegram-hook] saveGoal failed", {
          chatId,
          userId: link.user_id,
          error: String(err),
        });
        try {
          await sendTelegram(
            chatId,
            "Sorry, I couldn't save that goal. Try again.",
            botToken
          );
        } catch {
          // ignore
        }
      }
    } else {
      await sendTelegram(
        chatId,
        "Please provide a goal after /goal, e.g. `/goal Help me write daily tweets.`",
        botToken
      );
    }

    return NextResponse.json({ ok: true });
  }

  let reply: string;
  try {
    // Short-term memory (conversation history)
    const history = await getShortTermMemory(admin, link.user_id, agentId);

    // Long-term memory
    const memoryText = await getLongTermMemory(admin, link.user_id, agentId);

    // Active goal (auto-infer for non-technical users if missing)
    let goalText = await getActiveGoal(admin, link.user_id, agentId);
    if (!goalText) {
      try {
        const history = await getShortTermMemory(
          admin,
          link.user_id,
          agentId
        );
        const conversationText = [...history, { role: "user", content: text }]
          .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
          .join("\n");

        const inferred = await extractGoal(conversationText);
        if (inferred) {
          goalText = inferred;
          justInferredGoal = inferred;
          await saveGoal(admin, link.user_id, agentId, inferred);
        }
      } catch (err) {
        console.error("[telegram-hook] extractGoal failed", {
          userId: link.user_id,
          agentId,
          error: String(err),
        });
      }
    }

    const systemPromptParts = [
      "You are an autonomous AI agent.",
      goalText
        ? `Your goal: ${goalText}\n\nContinuously help the user achieve this.`
        : "Continuously help the user solve problems and move forward.",
      memoryText
        ? `You know the following about the user:\n- ${memoryText}`
        : "You currently do not know much about the user. Learn about them over time.",
      "Be proactive, helpful, and action-oriented.",
    ];

    const systemPrompt = systemPromptParts.join("\n\n");

    const messagesForModel: AgentMessage[] = [
      ...history,
      { role: "user", content: text },
    ];

    reply = await askAI(systemPrompt, messagesForModel);
  } catch (err) {
    console.error("[telegram-hook] askAI failed", {
      chatId,
      userId: link.user_id,
      error: String(err),
    });
    try {
      await sendTelegram(
        chatId,
        "Sorry, the AI failed. Try again in a moment.",
        botToken
      );
    } catch {
      // ignore
    }
    return NextResponse.json({ ok: true });
  }

  // Persist memories (short-term + long-term) but don't block reply if they fail
  (async () => {
    try {
      await saveShortTermMemory(admin, link.user_id, agentId, text, reply);
    } catch (err) {
      console.error("[telegram-hook] saveShortTermMemory failed", {
        userId: link.user_id,
        agentId,
        error: String(err),
      });
    }

    try {
      const longTerm = await extractMemory(
        `User: ${text}\n\nAssistant: ${reply}`
      );
      if (longTerm) {
        await saveLongTermMemory(admin, link.user_id, agentId, longTerm);
      }
    } catch (err) {
      console.error("[telegram-hook] saveLongTermMemory failed", {
        userId: link.user_id,
        agentId,
        error: String(err),
      });
    }
  })();

  try {
    await sendTelegram(chatId, reply, botToken);

    if (justInferredGoal) {
      const confirmation =
        `I'll focus on helping you with: "${justInferredGoal}". ` +
        "Does that sound right?";
      await sendTelegram(chatId, confirmation, botToken);
    }
  } catch (err) {
    console.error("[telegram-hook] sendTelegram failed", {
      chatId,
      userId: link.user_id,
      error: String(err),
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
