"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  PauseCircle,
  PlayCircle,
  Settings,
  Shield,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";

export default function DashboardPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [agentLive, setAgentLive] = useState(true);
  const [lastPing, setLastPing] = useState<string | null>(null);
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUserId(data.user.id);
      const { data: agent } = await supabase
        .from("agents")
        .select("status, last_ping")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (agent) {
        setAgentLive(agent.status === "live");
        setLastPing(agent.last_ping ?? null);
      }

      const { data: logs } = await supabase
        .from("activity_logs")
        .select("message")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false })
        .limit(4);
      if (logs?.length) {
        setActivityLog(logs.map((log) => log.message));
      }
      setCheckingAuth(false);
    };
    checkSession();
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-6xl items-center justify-center px-6 py-16">
        <p className="text-sm text-muted">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Your Lobster HQ</h1>
          <p className="text-muted">
            OpenClaw is running in the background. You can relax.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (!userId) return;
              const nextStatus = agentLive ? "paused" : "live";
              setAgentLive(!agentLive);
              await supabase
                .from("agents")
                .update({ status: nextStatus })
                .eq("user_id", userId);
            }}
            disabled={!userId}
          >
            {agentLive ? (
              <>
                <PauseCircle size={16} />
                Pause agent
              </>
            ) : (
              <>
                <PlayCircle size={16} />
                Resume agent
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/onboarding")}>
            <Settings size={16} />
            Update setup
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass-card rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Agent status</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                agentLive
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {agentLive ? "Live" : "Paused"}
            </span>
          </div>
          <div className="mt-4 space-y-3 text-sm text-muted">
            <p className="flex items-center gap-2">
              <Shield size={14} className="text-lobster" />
              Approval mode: Safe defaults enabled
            </p>
            <p className="flex items-center gap-2">
              <Activity size={14} className="text-lobster" />
              Last ping: {lastPing ? new Date(lastPing).toLocaleString() : "—"}
            </p>
            <p className="flex items-center gap-2">
              <Settings size={14} className="text-lobster" />
              Active integrations: Telegram, Claude
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card p-6">
          <h2 className="text-lg font-semibold">Daily activity log</h2>
          {activityLog.length ? (
            <ul className="mt-4 space-y-3 text-sm text-muted">
              {activityLog.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-lobster" />
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">
              No activity yet. Your lobster will report back here.
            </p>
          )}
          <Button variant="ghost" size="sm" className="mt-6">
            View full activity history
          </Button>
        </div>
      </div>

      <div className="mt-10 rounded-3xl border border-border/60 bg-background/60 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-muted">Need help?</p>
            <h3 className="text-lg font-semibold">
              Share your lobster story on X
            </h3>
            <p className="text-sm text-muted">
              We love highlighting wins and magical automations.
            </p>
          </div>
          <Button variant="outline" size="sm">
            Share on X
          </Button>
        </div>
      </div>
    </div>
  );
}
