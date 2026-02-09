import type { SupabaseClient } from "@supabase/supabase-js";

export type ToolResult = { ok: boolean; message: string };

/**
 * Create a task for the user. Called when the agent decides to record a todo.
 */
export async function createTask(
  supabase: SupabaseClient,
  userId: string,
  agentId: string,
  title: string,
  body?: string
): Promise<ToolResult> {
  if (!title.trim()) return { ok: false, message: "Task title required" };
  const { error } = await supabase.from("agent_tasks").insert({
    user_id: userId,
    agent_id: agentId,
    title: title.trim(),
    body: body?.trim() ?? null,
    status: "pending",
  });
  if (error) {
    console.error("[agent-tools] createTask failed", error);
    return { ok: false, message: error.message };
  }
  return { ok: true, message: `Task created: ${title.trim()}` };
}

/**
 * List pending tasks for the user (so the agent can reference them).
 */
export async function listTasks(
  supabase: SupabaseClient,
  userId: string,
  agentId: string,
  limit = 10
): Promise<{ title: string; body: string | null; status: string }[]> {
  const { data } = await supabase
    .from("agent_tasks")
    .select("title, body, status")
    .eq("user_id", userId)
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    title: r.title as string,
    body: r.body as string | null,
    status: r.status as string,
  }));
}

/**
 * Mark a task done by title match (first pending match).
 */
export async function completeTask(
  supabase: SupabaseClient,
  userId: string,
  agentId: string,
  titleSubstring: string
): Promise<ToolResult> {
  const { data: row } = await supabase
    .from("agent_tasks")
    .select("id")
    .eq("user_id", userId)
    .eq("agent_id", agentId)
    .eq("status", "pending")
    .ilike("title", `%${titleSubstring.trim()}%`)
    .limit(1)
    .maybeSingle();
  if (!row) return { ok: false, message: "No matching pending task found" };
  const { error } = await supabase
    .from("agent_tasks")
    .update({ status: "done" })
    .eq("id", row.id);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Task marked done" };
}

/**
 * Send email (stub). Set RESEND_API_KEY and FROM_EMAIL to enable.
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<ToolResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, message: "Email not configured (RESEND_API_KEY missing)" };
  }
  const from = process.env.FROM_EMAIL ?? "onboarding@resend.dev";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text: body }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { ok: false, message: err.slice(0, 200) };
    }
    return { ok: true, message: "Email sent" };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}
