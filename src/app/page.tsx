"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramConnecting, setTelegramConnecting] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [telegramCode, setTelegramCode] = useState<string | null>(null);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramChecking, setTelegramChecking] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployDone, setDeployDone] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ? { id: data.user.id } : null);
      if (data.user) {
        const pr = await fetch("/api/profile");
        if (pr.ok) {
          const p = await pr.json();
          setIsPaid(Boolean(p?.paid));
        }
        const ls = await fetch("/api/telegram/link-status");
        if (ls.ok) {
          const l = await ls.json();
          setTelegramLinked(Boolean(l?.verified));
          if (l?.code) setTelegramCode(l.code);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const signInGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setTelegramLinked(false);
    setTelegramCode(null);
    setDeployDone(false);
  };

  const connectBot = async () => {
    const token = telegramToken.trim();
    if (!token) {
      setTelegramError("Enter bot token");
      return;
    }
    setTelegramConnecting(true);
    setTelegramError(null);
    const res = await fetch("/api/telegram/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    setTelegramConnecting(false);
    if (!res.ok) {
      setTelegramError(data?.error ?? "Failed");
      return;
    }
    setTelegramCode(data?.code ?? null);
    setTelegramToken("");
  };

  const getCode = async () => {
    setTelegramChecking(true);
    const res = await fetch("/api/telegram/link-code", { method: "POST" });
    const data = await res.json();
    setTelegramChecking(false);
    if (res.ok) {
      setTelegramCode(data?.code ?? null);
      setTelegramLinked(Boolean(data?.verified));
    }
  };

  const checkLinked = async () => {
    setTelegramChecking(true);
    const res = await fetch("/api/telegram/link-status");
    const data = await res.json();
    setTelegramChecking(false);
    if (!res.ok) return;
    const verified = Boolean(data?.verified);
    setTelegramLinked(verified);
    if (verified) {
      await fetch("/api/onboarding/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "telegram_link" }),
      });
    }
  };

  const deploy = async () => {
    setDeploying(true);
    setDeployError(null);
    const res = await fetch("/api/deploy", { method: "POST" });
    if (res.status === 402) {
      router.push("/paywall?return=/");
      setDeploying(false);
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeployError(data?.error ?? "Failed");
      setDeploying(false);
      return;
    }
    setDeployDone(true);
    setDeploying(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-bold">OpenClaw</h1>
        <p className="mt-1 text-sm text-muted">Bot + deploy. One page.</p>
      </div>

      {!user ? (
        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            className="gap-2"
            onClick={signInGoogle}
          >
            <GoogleIcon />
            Sign in
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-background px-4 py-3 text-left text-sm font-medium"
              onClick={() => setTelegramOpen((o) => !o)}
            >
              <span className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Telegram
              </span>
              <ChevronDown className={`h-4 w-4 transition ${telegramOpen ? "rotate-180" : ""}`} />
            </button>
            {telegramOpen && (
              <div className="mt-2 space-y-3 rounded-xl border border-border/60 bg-background/60 p-4">
                <input
                  type="password"
                  placeholder="Bot token"
                  value={telegramToken}
                  onChange={(e) => {
                    setTelegramToken(e.target.value);
                    setTelegramError(null);
                  }}
                  className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
                />
                <Button size="sm" onClick={connectBot} disabled={telegramConnecting}>
                  {telegramConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
                </Button>
                {telegramError && (
                  <p className="text-xs text-red-600">{telegramError}</p>
                )}
                {telegramCode && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted">Send this to your bot:</p>
                    <div className="rounded-lg border border-border/60 bg-background px-3 py-2 text-center font-mono text-sm">
                      {telegramCode}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={getCode} disabled={telegramChecking}>
                        {telegramChecking ? "..." : "New code"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={checkLinked} disabled={telegramChecking}>
                        {telegramChecking ? "..." : "I sent it"}
                      </Button>
                    </div>
                    {telegramLinked && (
                      <p className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> Linked
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {telegramLinked && (
            <div className="space-y-2">
              <Button
                size="lg"
                className="w-full"
                onClick={deploy}
                disabled={deploying || deployDone}
              >
                {deploying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : deployDone ? (
                  "Done"
                ) : isPaid ? (
                  "Deploy"
                ) : (
                  "Pay & deploy"
                )}
              </Button>
              {deployError && <p className="text-center text-xs text-red-600">{deployError}</p>}
              {deployDone && (
                <p className="flex items-center justify-center gap-1 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Live. Message your bot.
                </p>
              )}
            </div>
          )}

          <p className="mt-8 text-center">
            <button type="button" onClick={signOut} className="text-xs text-muted underline">
              Sign out
            </button>
          </p>
        </>
      )}
    </div>
  );
}
