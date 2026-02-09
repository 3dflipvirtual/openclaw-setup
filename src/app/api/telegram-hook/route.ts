import { NextRequest, NextResponse } from "next/server";

import { decryptSecret } from "@/lib/crypto";
import {
  completeTask,
  createTask,
  listTasks,
  sendEmail,
} from "@/lib/agent-tools";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { searchAndExtract } from "@/lib/browser";

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
      max_tokens: 400,
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

async function isBrowserEnabledForAgent(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  agentId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("agent_permissions")
    .select("browser_enabled")
    .eq("user_id", userId)
    .eq("agent_id", agentId)
    .maybeSingle();

  return Boolean(data?.browser_enabled);
}

async function setBrowserPermission(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  agentId: string,
  enabled: boolean
) {
  await supabase.from("agent_permissions").upsert(
    {
      user_id: userId,
      agent_id: agentId,
      browser_enabled: enabled,
    },
    { onConflict: "user_id,agent_id" }
  );
}

async function getSoul(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  agentId: string
): Promise<string> {
  const { data } = await supabase
    .from("agent_soul")
    .select("soul")
    .eq("user_id", userId)
    .eq("agent_id", agentId)
    .maybeSingle();

  return (data?.soul as string) ?? "";
}

type WorkflowState = {
  plan_summary: string | null;
  steps: { title: string; status: string }[];
  current_step_index: number;
  status: string;
} | null;

async function getWorkflow(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  agentId: string
): Promise<WorkflowState> {
  const { data } = await supabase
    .from("agent_workflow")
    .select("plan_summary, steps, current_step_index, status")
    .eq("user_id", userId)
    .eq("agent_id", agentId)
    .maybeSingle();

  if (!data || data.status !== "active") return null;
  const steps = (data.steps as { title: string; status: string }[]) ?? [];
  return {
    plan_summary: data.plan_summary as string | null,
    steps,
    current_step_index: (data.current_step_index as number) ?? 0,
    status: data.status as string,
  };
}

async function saveWorkflow(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  agentId: string,
  planSummary: string,
  steps: { title: string; status: string }[]
) {
  await supabase.from("agent_workflow").upsert(
    {
      user_id: userId,
      agent_id: agentId,
      plan_summary: planSummary,
      steps,
      current_step_index: 0,
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,agent_id" }
  );
}

async function advanceWorkflowStep(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  agentId: string
) {
  const { data } = await supabase
    .from("agent_workflow")
    .select("steps, current_step_index")
    .eq("user_id", userId)
    .eq("agent_id", agentId)
    .maybeSingle();

  if (!data) return;
  const steps = (data.steps as { title: string; status: string }[]) ?? [];
  const idx = (data.current_step_index as number) ?? 0;
  if (idx < steps.length) {
    steps[idx] = { ...steps[idx], status: "done" };
    const nextIdx = idx + 1;
    const status = nextIdx >= steps.length ? "completed" : "active";
    await supabase
      .from("agent_workflow")
      .update({
        steps,
        current_step_index: nextIdx,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("agent_id", agentId);
  }
}

type ExtractedAction =
  | { type: "create_task"; title: string; body?: string }
  | { type: "complete_task"; title_substring: string }
  | { type: "send_email"; to: string; subject: string; body: string };

async function extractPlanFromReply(
  reply: string
): Promise<{ planSummary: string; steps: { title: string; status: string }[] } | null> {
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
      temperature: 0,
      system:
        "If the assistant message contains a clear numbered plan (e.g. 1. Do X 2. Do Y), return a JSON object: {\"planSummary\": \"short summary\", \"steps\": [{\"title\": \"Do X\", \"status\": \"pending\"}, {\"title\": \"Do Y\", \"status\": \"pending\"}]}. Otherwise return null.",
      messages: [{ role: "user", content: reply }],
    }),
  });

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const raw = data?.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
  if (!raw || raw.toLowerCase() === "null") return null;
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}") + 1;
    if (start === -1 || end <= start) return null;
    const parsed = JSON.parse(raw.slice(start, end));
    if (parsed?.planSummary && Array.isArray(parsed?.steps) && parsed.steps.length > 0) {
      return {
        planSummary: String(parsed.planSummary),
        steps: parsed.steps.map((s: { title?: string; status?: string }) => ({
          title: String(s?.title ?? ""),
          status: s?.status === "done" ? "done" : "pending",
        })),
      };
    }
  } catch {
    // ignore
  }
  return null;
}

async function extractActionsFromReply(reply: string): Promise<ExtractedAction[]> {
  const res = await fetch("https://api.minimax.io/anthropic/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PLATFORM_MINIMAX_API_KEY}`,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "MiniMax-M2.1",
      max_tokens: 300,
      temperature: 0,
      system:
        "Extract any explicit actions from the assistant message. " +
        "Return ONLY a JSON array. Each item: {\"type\": \"create_task\", \"title\": \"...\", \"body\": \"...\"} or " +
        "{\"type\": \"complete_task\", \"title_substring\": \"...\"} or " +
        "{\"type\": \"send_email\", \"to\": \"...\", \"subject\": \"...\", \"body\": \"...\"}. " +
        "If no clear action (e.g. creating a task, marking one done, sending email), return [].",
      messages: [{ role: "user", content: reply }],
    }),
  });

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const raw =
    data?.content?.find((c) => c.type === "text")?.text?.trim() ?? "[]";
  try {
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end <= start) return [];
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function needsBrowser(userText: string): Promise<boolean> {
  // Fast classification call: should we try real web browsing?
  const res = await fetch("https://api.minimax.io/anthropic/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PLATFORM_MINIMAX_API_KEY}`,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "MiniMax-M2.1",
      max_tokens: 5,
      temperature: 0,
      system:
        "You are a classifier. Decide if the user's request clearly **requires live web browsing** (for example, current prices, latest news, or information that strongly depends on the present internet).\n" +
        "Reply with a single word: YES or NO.",
      messages: [
        {
          role: "user",
          content: userText,
        },
      ],
    }),
  });

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const answer =
    data?.content?.find((c) => c.type === "text")?.text?.trim().toUpperCase() ??
    "NO";

  return answer.startsWith("Y");
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

  const trimmed = text.trim();

  // Browser permission flow
  if (trimmed.toLowerCase() === "/browser on") {
    // Record intent, but keep browser disabled until explicit CONFIRM
    await setBrowserPermission(admin, link.user_id, agentId, false);

    const warning =
      "⚠️ Browser Control Enabled Request\n\n" +
      "This allows the AI to:\n" +
      "- browse websites\n" +
      "- click links\n" +
      "- fill forms\n" +
      "- navigate pages automatically\n\n" +
      "Never enable this for sensitive accounts.\n\n" +
      "Type:\n" +
      "CONFIRM\n" +
      "to activate.";

    await sendTelegram(chatId, warning, botToken);
    return NextResponse.json({ ok: true });
  }

  if (trimmed === "CONFIRM") {
    await setBrowserPermission(admin, link.user_id, agentId, true);
    await sendTelegram(chatId, "✅ Full browser control activated.", botToken);
    return NextResponse.json({ ok: true });
  }

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

    // Decide if we need live web browsing
    const globalBrowserEnabled =
      (process.env.BROWSER_ENABLED ?? "").toLowerCase() === "true";

    let liveBrowserData: string | null = null;
    if (globalBrowserEnabled && (await needsBrowser(text))) {
      const enabledForAgent = await isBrowserEnabledForAgent(
        admin,
        link.user_id,
        agentId
      );

      if (!enabledForAgent) {
        await sendTelegram(
          chatId,
          "Browser control is not enabled. The user must enable it with /browser on.",
          botToken
        );
        return NextResponse.json({ ok: true });
      }

      try {
        liveBrowserData = await searchAndExtract(text);
      } catch (err) {
        console.error("[telegram-hook] browser search failed", {
          userId: link.user_id,
          agentId,
          error: String(err),
        });
      }
    }

    const soul = await getSoul(admin, link.user_id, agentId);
    const workflow = await getWorkflow(admin, link.user_id, agentId);
    const tasks = await listTasks(admin, link.user_id, agentId, 10);

    const systemPromptParts = [
      "You are an autonomous AI agent.",
      soul
        ? `PERSONALITY:\n${soul}`
        : "Be proactive, opinionated, concise and helpful. Avoid corporate tone. Speak like a real operator.",
      goalText
        ? `YOUR GOAL:\n${goalText}\n\nContinuously help the user achieve this.`
        : "Continuously help the user solve problems and move forward.",
      memoryText
        ? `YOU KNOW THIS ABOUT THE USER:\n${memoryText}`
        : "You currently do not know much about the user. Learn about them over time.",
      tasks.length > 0
        ? `CURRENT TASKS (you can create_task, complete_task):\n${tasks.map((t) => `- [${t.status}] ${t.title}${t.body ? `: ${t.body.slice(0, 80)}` : ""}`).join("\n")}`
        : "The user has no tasks yet. You can create tasks when they ask for reminders or todos.",
      workflow
        ? `MULTI-STEP PLAN (execute current step, then say when done):\nSummary: ${workflow.plan_summary ?? "—"}\nSteps: ${workflow.steps.map((s, i) => `${i + 1}. [${s.status}] ${s.title}`).join("; ")}\nCurrent step index: ${workflow.current_step_index + 1}. Complete this step and say "Step N done" when finished.`
        : "You can propose a multi-step plan when the user asks for something complex; we will track it.",
      "You can take actions: create_task(title, body), complete_task(title_substring), send_email(to, subject, body). We will run them after your reply. Be proactive.",
      "Safety rules for browser control:\n" +
        "- If browser control is enabled: access banking or private accounts only after explicitly asking for permission.\n" +
        "- Never submit passwords or sensitive authentication codes.\n" +
        "- Prefer browsing public information and ask for permission before accessing anything private.\n" +
        "- When you browse, always explain what you are doing step by step.",
      "Always be proactive, opinionated, concise and helpful. Avoid corporate tone. Speak like a real operator.",
    ];

    if (liveBrowserData) {
      systemPromptParts.push(`Live browser data:\n${liveBrowserData}`);
    }

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

  // Multi-step: if agent proposed a new plan and we have none, save it
  const workflowBefore = await getWorkflow(admin, link.user_id, agentId);
  if (!workflowBefore) {
    try {
      const plan = await extractPlanFromReply(reply);
      if (plan && plan.steps.length > 0) {
        await saveWorkflow(admin, link.user_id, agentId, plan.planSummary, plan.steps);
      }
    } catch (err) {
      console.error("[telegram-hook] extractPlan failed", { userId: link.user_id, error: String(err) });
    }
  }

  // Run extracted actions (create_task, complete_task, send_email)
  let actionResults: string[] = [];
  try {
    const actions = await extractActionsFromReply(reply);
    for (const a of actions) {
      if (a.type === "create_task") {
        const r = await createTask(
          admin,
          link.user_id,
          agentId,
          a.title,
          a.body
        );
        if (r.ok) actionResults.push(r.message);
      } else if (a.type === "complete_task") {
        const r = await completeTask(
          admin,
          link.user_id,
          agentId,
          a.title_substring
        );
        if (r.ok) actionResults.push(r.message);
      } else if (a.type === "send_email") {
        const r = await sendEmail(a.to, a.subject, a.body);
        if (r.ok) actionResults.push(r.message);
      }
    }
    // Multi-step: if reply suggests "step N done", advance workflow
    if (/step\s*\d+\s*(done|complete|finished)/i.test(reply)) {
      await advanceWorkflowStep(admin, link.user_id, agentId);
    }
  } catch (err) {
    console.error("[telegram-hook] actions failed", { userId: link.user_id, error: String(err) });
  }

  try {
    await sendTelegram(chatId, reply, botToken);

    if (actionResults.length > 0) {
      await sendTelegram(
        chatId,
        "✅ " + actionResults.join(". "),
        botToken
      );
    }

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
