"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PauseCircle, PlayCircle, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";

export default function DashboardPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [agentLive, setAgentLive] = useState(true);
  const [lastPing, setLastPing] = useState<string | null>(null);
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
      setCheckingAuth(false);
    };
    checkSession();
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-6xl items-center justify-center px-6 py-16">
        <p className="text-sm text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted">
            Status: {agentLive ? "Live" : "Paused"}
            {lastPing ? ` · Last ping ${new Date(lastPing).toLocaleString()}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
                Pause
              </>
            ) : (
              <>
                <PlayCircle size={16} />
                Resume
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/onboarding")}>
            <Settings size={16} />
            Setup
          </Button>
        </div>
      </div>
    </div>
  );
}
