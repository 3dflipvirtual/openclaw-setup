"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";

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

function TelegramIcon({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0088cc] text-white ${className ?? ""}`}
      aria-hidden
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    </span>
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
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

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
    setSignInError(null);
    setSigningIn(true);
    const origin = window.location.origin;
    const redirectTo = `${origin}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });

    if (error) {
      setSignInError(error.message ?? "Sign-in failed");
      setSigningIn(false);
      return;
    }
    if (!data?.url) {
      setSignInError("Could not start sign-in");
      setSigningIn(false);
      return;
    }

    const isSameSite = (urlOrigin: string) => {
      if (urlOrigin === origin) return true;
      try {
        const a = new URL(origin);
        const b = new URL(urlOrigin);
        const strip = (h: string) => h.replace(/^www\./, "");
        return a.protocol === b.protocol && strip(a.hostname) === strip(b.hostname) && a.port === b.port;
      } catch {
        return false;
      }
    };
    const handleMessage = async (event: MessageEvent) => {
      if (!isSameSite(event.origin) || event.data?.type !== "supabase-auth") return;
      window.removeEventListener("message", handleMessage);
      if (intervalRef.current) clearInterval(intervalRef.current);
      try {
        const { code, access_token, refresh_token } = event.data;
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw new Error(error.message);
        } else if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        } else {
          setSigningIn(false);
          return;
        }
        const { data: userData } = await supabase.auth.getUser();
        setUser(userData.user ? { id: userData.user.id } : null);
        if (userData.user) {
          const [pr, ls] = await Promise.all([
            fetch("/api/profile"),
            fetch("/api/telegram/link-status"),
          ]);
          if (pr.ok) {
            const p = await pr.json();
            setIsPaid(Boolean(p?.paid));
          }
          if (ls.ok) {
            const l = await ls.json();
            setTelegramLinked(Boolean(l?.verified));
            if (l?.code) setTelegramCode(l.code);
          }
        }
      } catch {
        setSignInError("Session could not be applied");
      }
      setSigningIn(false);
    };

    window.addEventListener("message", handleMessage);

    const width = 500;
    const height = 600;
    const left = Math.round((window.screen.width - width) / 2);
    const top = Math.round((window.screen.height - height) / 2);
    const popup = window.open(
      data.url,
      "google-signin",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    popupCheckInterval = setInterval(() => {
      if (popup?.closed) {
        if (popupCheckInterval) clearInterval(popupCheckInterval);
        window.removeEventListener("message", handleMessage);
        setSigningIn(false);
      }
    }, 300);
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
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">OpenClaw</h1>
        <p className="mt-1 text-sm text-muted">Bot + deploy. One page.</p>
      </div>

      <div className="glass-card rounded-2xl p-6">
        {!user ? (
          <>
            <p className="mb-4 text-sm font-medium text-foreground">
              Which channel do you want to use?
            </p>
            <div className="mb-6 flex justify-center">
              <div className="inline-flex items-center gap-3 rounded-xl border-2 border-border bg-card px-4 py-3 text-sm font-medium ring-1 ring-foreground/10">
                <TelegramIcon />
                <span>Telegram</span>
              </div>
            </div>
            <Button
              size="lg"
              className="w-full gap-2 bg-foreground text-background hover:bg-foreground/90"
              onClick={signInGoogle}
              disabled={signingIn}
            >
              {signingIn ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              {signingIn ? "Signing in…" : "Sign in with Google"}
            </Button>
            {signInError && (
              <p className="text-center text-xs text-red-600">{signInError}</p>
            )}
            <p className="mt-4 text-center text-xs text-muted">
              Sign in to deploy your AI assistant and connect Telegram.
            </p>
          </>
        ) : (
          <>
            <div className="mb-6">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-background px-4 py-3 text-left text-sm font-medium transition hover:bg-muted/30"
                onClick={() => setTelegramOpen((o) => !o)}
              >
                <span className="flex items-center gap-2">
                  <TelegramIcon className="h-9 w-9" />
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

            <p className="mt-6 text-center">
              <button type="button" onClick={signOut} className="text-xs text-muted underline hover:text-foreground">
                Sign out
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
