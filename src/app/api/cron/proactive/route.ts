import { NextRequest, NextResponse } from "next/server";

import { listTasks } from "@/lib/agent-tools";
import { decryptSecret } from "@/lib/crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const PROACTIVE_SECRET =
  process.env.CRON_SECRET ?? process.env.PROACTIVE_AGENT_SECRET ?? "";

async function askProactive(system: string): Promise<string> {
  const res = await fetch("https://api.minimax.io/anthropic/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PLATFORM_MINIMAX_API_KEY}`,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "MiniMax-M2.1",
      max_tokens: 150,
      temperature: 0.5,
      system,
      messages: [
        {
          role: "user",
          content:
            "Do you have an update, question, or suggestion for the user right now? Reply with a short message to send them, or exactly NOTHING if there's nothing to say.",
        },
      ],
    }),
  });

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  return (
    data?.content?.find((c) => c.type === "text")?.text?.trim() ?? "NOTHING"
  );
}

async function sendTelegram(
  chatId: number,
  text: string,
  botToken: string
): Promise<void> {
  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API ${res.status}: ${body.slice(0, 200)}`);
  }
}

function getSecret(req: NextRequest): string {
  return (
    req.nextUrl.searchParams.get("secret") ??
    req.headers.get("x-cron-secret") ??
    (req.method === "POST"
      ? (req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "")
      : "") ??
    ""
  );
}

export async function GET(req: NextRequest) {
  if (!PROACTIVE_SECRET || getSecret(req) !== PROACTIVE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runProactive();
}

export async function POST(req: NextRequest) {
  if (!PROACTIVE_SECRET || getSecret(req) !== PROACTIVE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runProactive();
}

async function runProactive() {
  const admin = createAdminSupabaseClient();
  const { data: links } = await admin
    .from("telegram_links")
    .select("user_id, bot_token_encrypted, chat_id")
    .eq("verified", true)
    .not("chat_id", "is", null);

  if (!links?.length) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  let sent = 0;
  for (const link of links) {
    const chatId = link.chat_id as number;
    if (!chatId) continue;

    let botToken: string;
    try {
      botToken = decryptSecret(link.bot_token_encrypted as string);
    } catch {
      continue;
    }

    const agentId = botToken;
    const userId = link.user_id as string;

    const [{ data: soulRow }, { data: goalRow }, { data: memoryRows }, { data: workflowRow }] =
      await Promise.all([
        admin
          .from("agent_soul")
          .select("soul")
          .eq("user_id", userId)
          .eq("agent_id", agentId)
          .maybeSingle(),
        admin
          .from("agent_goals")
          .select("goal")
          .eq("user_id", userId)
          .eq("agent_id", agentId)
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        admin
          .from("agent_long_memory")
          .select("content")
          .eq("user_id", userId)
          .eq("agent_id", agentId)
          .order("created_at", { ascending: false })
          .limit(10),
        admin
          .from("agent_workflow")
          .select("plan_summary, steps, current_step_index, status")
          .eq("user_id", userId)
          .eq("agent_id", agentId)
          .eq("status", "active")
          .maybeSingle(),
      ]);

    const soul = (soulRow?.soul as string) ?? "";
    const goal = (goalRow?.goal as string) ?? "";
    const memoryText = (memoryRows ?? [])
      .map((r) => r.content as string)
      .filter(Boolean)
      .join("\n- ");
    const workflow = workflowRow
      ? `Plan: ${workflowRow.plan_summary ?? "—"}. Steps: ${JSON.stringify(workflowRow.steps)}. Current: ${(workflowRow.current_step_index as number) + 1}.`
      : "";

    const tasks = await listTasks(admin, userId, agentId, 10);
    const tasksText =
      tasks.length > 0
        ? tasks
            .map(
              (t) =>
                `- [${t.status}] ${t.title}${t.body ? `: ${t.body.slice(0, 60)}` : ""}`
            )
            .join("\n")
        : "";

    const systemParts = [
      "You are an autonomous AI agent. Be brief.",
      soul ? `PERSONALITY: ${soul.slice(0, 300)}` : "",
      goal ? `YOUR GOAL: ${goal}` : "",
      memoryText ? `YOU KNOW: ${memoryText.slice(0, 400)}` : "",
      workflow ? `CURRENT WORK: ${workflow}` : "",
      tasksText ? `CURRENT TASKS:\n${tasksText}` : "",
    ].filter(Boolean);

    const response = await askProactive(systemParts.join("\n"));
    const trimmed = response.trim().toUpperCase();
    if (trimmed === "NOTHING" || trimmed.length < 2) continue;

    try {
      await sendTelegram(chatId, response, botToken);
      sent++;
      console.log("[proactive] sent to user", userId);
    } catch (err) {
      console.error("[proactive] send failed", { userId, error: String(err) });
    }
  }

  return NextResponse.json({ ok: true, sent });
}

