"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { PERSONALITIES } from "@/lib/personalities";
import { supabase } from "@/lib/supabase/client";

const WHOP_CHECKOUT_URL =
  process.env.NEXT_PUBLIC_WHOP_CHECKOUT_URL ??
  "https://whop.com/checkout/plan_45JMn0cnZdK2P";

const WHOP_RECHARGE_URL = "https://whop.com/checkout/plan_sS1L8L8ME8ls4";

function GoogleIconWhite() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="white"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="white"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="white"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="white"
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

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white ${className ?? ""}`}
      aria-hidden
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    </span>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5865F2] text-white ${className ?? ""}`}
      aria-hidden
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    </span>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramConnecting, setTelegramConnecting] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [telegramCode, setTelegramCode] = useState<string | null>(null);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramDisconnecting, setTelegramDisconnecting] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployDone, setDeployDone] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [telegramChannelSelected, setTelegramChannelSelected] = useState(false);
  const [personalitySelected, setPersonalitySelected] = useState(true);
  const [savingPersonality, setSavingPersonality] = useState(false);
  const [usage, setUsage] = useState<{
    monthlyPercent: number;
    rechargePercent: number;
    hasRecharge: boolean;
    nearLimit: boolean;
  } | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ? { id: data.user.id } : null);
      if (data.user) {
        const pr = await fetch("/api/profile");
        if (pr.ok) {
          const p = (await pr.json()) as { paid?: boolean; personalitySelected?: boolean };
          setIsPaid(Boolean(p?.paid));
          setPersonalitySelected(Boolean(p?.personalitySelected));
        }
        const ls = await fetch("/api/telegram/link-status");
        if (ls.ok) {
          const l = (await ls.json()) as { verified?: boolean; code?: string };
          setTelegramLinked(Boolean(l?.verified));
          if (l?.code) setTelegramCode(l.code);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  // After return from Whop checkout, refetch profile (webhook may have just set paid)
  useEffect(() => {
    if (!searchParams.get("checkout") || !user) return;
    const t = setTimeout(async () => {
      const pr = await fetch("/api/profile");
      if (pr.ok) {
        const p = (await pr.json()) as { paid?: boolean };
        setIsPaid(Boolean(p?.paid));
      }
      router.replace("/", { scroll: false });
    }, 1500);
    return () => clearTimeout(t);
  }, [searchParams, user, router]);

  // After return from Whop recharge checkout, refetch usage
  useEffect(() => {
    if (!searchParams.get("recharge") || !user) return;
    const t = setTimeout(async () => {
      const res = await fetch("/api/usage");
      if (res.ok) {
        const data = (await res.json()) as {
          monthlyPercent: number; rechargePercent: number;
          hasRecharge: boolean; nearLimit: boolean;
        };
        setUsage(data);
      }
      router.replace("/", { scroll: false });
    }, 1500);
    return () => clearTimeout(t);
  }, [searchParams, user, router]);

  // Fetch usage data for logged-in paid users
  // Fetch usage data for logged-in paid users
  useEffect(() => {
    if (!user || !isPaid) return;
    const fetchUsage = async () => {
      const res = await fetch("/api/usage");
      if (res.ok) {
        const data = (await res.json()) as {
          monthlyPercent: number; rechargePercent: number;
          hasRecharge: boolean; nearLimit: boolean;
        };
        setUsage(data);
      }
    };
    fetchUsage();
  }, [user, isPaid]);

  // Auto-poll link status after code is shown (every 3s until verified)
  useEffect(() => {
    if (!telegramCode || telegramLinked) return;
    const interval = setInterval(async () => {
      const res = await fetch("/api/telegram/link-status");
      if (!res.ok) return;
      const data = (await res.json()) as { verified?: boolean };
      if (data?.verified) {
        setTelegramLinked(true);
        await fetch("/api/onboarding/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "telegram_link" }),
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [telegramCode, telegramLinked]);

  const signInGoogle = async () => {
    setSignInError(null);
    setSigningIn(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback` },
    });
    if (error) {
      setSignInError(error.message ?? "Sign-in failed");
      setSigningIn(false);
      return;
    }
    // Supabase redirects the current window to Google; no popup
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setTelegramLinked(false);
    setTelegramCode(null);
    setDeployDone(false);
  };

  const disconnectTelegram = async () => {
    setTelegramDisconnecting(true);
    try {
      const res = await fetch("/api/telegram/disconnect", { method: "POST" });
      if (res.ok) {
        setTelegramLinked(false);
        setTelegramCode(null);
        setTelegramToken("");
      }
    } finally {
      setTelegramDisconnecting(false);
    }
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
    const data = (await res.json()) as { error?: string; code?: string };
    setTelegramConnecting(false);
    if (!res.ok) {
      setTelegramError(data?.error ?? "Failed");
      return;
    }
    setTelegramCode(data?.code ?? null);
    setTelegramToken("");
  };

  const getCode = async () => {
    const res = await fetch("/api/telegram/link-code", { method: "POST" });
    const data = (await res.json()) as { code?: string; verified?: boolean };
    if (res.ok) {
      setTelegramCode(data?.code ?? null);
      if (data?.verified) setTelegramLinked(true);
    }
  };


  const deploy = async () => {
    setDeploying(true);
    setDeployError(null);
    const res = await fetch("/api/deploy", { method: "POST" });
    if (res.status === 402) {
      window.location.href = WHOP_CHECKOUT_URL;
      setDeploying(false);
      return;
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
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
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="mb-6 text-center sm:mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:whitespace-nowrap sm:text-5xl">
          Deploy Openclaw in seconds.
        </h1>
      </div>

      <div className="glass-card rounded-2xl p-4 sm:p-6">
        {user && !personalitySelected ? (
          <>
            <p className="mb-4 text-center text-base font-medium text-foreground sm:text-lg">
              Choose your agent&apos;s personality
            </p>
            <p className="mb-6 text-center text-sm text-muted">
              Your AI will use this tone in every reply. You can change it later in settings.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {PERSONALITIES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={savingPersonality}
                  className="rounded-xl border-2 border-border bg-card p-4 text-left transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md active:translate-y-0 disabled:opacity-60"
                  onClick={async () => {
                    setSavingPersonality(true);
                    const res = await fetch("/api/onboarding/save", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ type: "personality", value: p.id }),
                    });
                    setSavingPersonality(false);
                    if (res.ok) {
                      setPersonalitySelected(true);
                    }
                  }}
                >
                  <div className="font-semibold text-foreground">{p.label}</div>
                  <div className="mt-1 text-sm text-muted">{p.description}</div>
                </button>
              ))}
            </div>
          </>
        ) : !user ? (
          <>
            <p className="mb-4 text-base font-medium text-foreground sm:text-lg">
              Which channel do you want to use for sending messages?
            </p>
            <div className="mb-6 flex flex-wrap items-center justify-center gap-3 sm:flex-nowrap">
              <button
                type="button"
                onClick={() => setTelegramChannelSelected(true)}
                className={`inline-flex min-h-[4.5rem] min-w-[11rem] flex-row items-center justify-center gap-3 rounded-xl border-2 bg-card px-5 py-3 text-sm font-medium shadow-sm transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm ${
                  telegramChannelSelected
                    ? "border-white ring-2 ring-white/50 shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                    : "border-border ring-0 hover:border-border"
                }`}
              >
                <TelegramIcon />
                <span>Telegram</span>
              </button>
              <div className="inline-flex min-h-[4.5rem] min-w-[11rem] flex-col cursor-not-allowed items-center justify-center gap-1 rounded-xl border-2 border-border bg-muted/50 px-5 py-3 text-sm font-medium text-muted-foreground opacity-75">
                <div className="flex items-center gap-3">
                  <DiscordIcon />
                  <span>Discord</span>
                </div>
                <span className="text-xs text-muted-foreground">Coming soon</span>
              </div>
              <div className="inline-flex min-h-[4.5rem] min-w-[11rem] flex-col cursor-not-allowed items-center justify-center gap-1 rounded-xl border-2 border-border bg-muted/50 px-5 py-3 text-sm font-medium text-muted-foreground opacity-75">
                <div className="flex items-center gap-3">
                  <WhatsAppIcon />
                  <span>WhatsApp</span>
                </div>
                <span className="text-xs text-muted-foreground">Coming soon</span>
              </div>
            </div>
            <Button
              size="lg"
              className="w-full gap-2 bg-[#FF5F1F] text-white hover:bg-[#FF5F1F]/90"
              onClick={signInGoogle}
              disabled={signingIn}
            >
              {signingIn ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <GoogleIconWhite />
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
                className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-background px-4 py-3 text-left text-sm font-medium transition-[transform,box-shadow] hover:-translate-y-0.5 hover:bg-muted/30 hover:shadow-md active:translate-y-0 active:shadow-sm"
                onClick={() => setTelegramOpen((o) => !o)}
              >
                <span className="flex items-center gap-2">
                  <TelegramIcon className="h-9 w-9" />
                  Telegram
                </span>
                <ChevronDown className={`h-4 w-4 transition ${telegramOpen ? "rotate-180" : ""}`} />
              </button>
              {telegramLinked && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-4 py-2">
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" /> Linked
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnectTelegram}
                    disabled={telegramDisconnecting}
                  >
                    {telegramDisconnecting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Disconnect"
                    )}
                  </Button>
                </div>
              )}
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
                      {telegramLinked ? (
                        <p className="flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" /> Linked
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <p className="flex items-center gap-1 text-xs text-muted">
                            <Loader2 className="h-3 w-3 animate-spin" /> Waiting for you to send the code…
                          </p>
                          <Button variant="outline" size="sm" onClick={getCode}>
                            New code
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {telegramLinked && (
              <div className="space-y-2">
                {isPaid ? (
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
                    ) : (
                      "Deploy"
                    )}
                  </Button>
                ) : (
                  <a
                    href={WHOP_CHECKOUT_URL}
                    target="_self"
                    rel="noopener noreferrer"
                    className={buttonVariants({ size: "lg", className: "w-full" })}
                  >
                    Pay & deploy
                  </a>
                )}
                {deployError && <p className="text-center text-xs text-red-600">{deployError}</p>}
                {deployDone && (
                  <p className="flex items-center justify-center gap-1 text-sm text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> Live. Message your bot.
                  </p>
                )}
              </div>
            )}

            {usage && isPaid && (
              <div className="mt-6 space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted">
                    <span>Monthly usage</span>
                    <span>{usage.monthlyPercent}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
                    <div
                      className={`h-full rounded-full transition-all ${
                        usage.monthlyPercent >= 80 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${usage.monthlyPercent}%` }}
                    />
                  </div>
                </div>

                {usage.hasRecharge && (
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted">
                      <span>Recharge credits</span>
                      <span>{usage.rechargePercent}% used</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
                      <div
                        className={`h-full rounded-full transition-all ${
                          usage.rechargePercent >= 80 ? "bg-amber-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${usage.rechargePercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {usage.nearLimit && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center">
                    <p className="mb-2 text-xs text-amber-400">
                      You&apos;re approaching your usage limit.
                    </p>
                    <a
                      href={`${WHOP_RECHARGE_URL}?d=${encodeURIComponent(
                        `${typeof window !== "undefined" ? window.location.origin : ""}/?recharge=success`
                      )}`}
                      target="_self"
                      className={buttonVariants({
                        size: "sm",
                        className: "bg-amber-500 text-white hover:bg-amber-600",
                      })}
                    >
                      Recharge tokens — $10
                    </a>
                  </div>
                )}

                {searchParams.get("recharge") === "success" && (
                  <p className="flex items-center justify-center gap-1 text-sm text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> Credits recharged!
                  </p>
                )}
              </div>
            )}

            <p className="mt-6 text-center">
              <button
                type="button"
                onClick={signOut}
                className="inline-block text-xs text-muted underline transition-[transform,color] hover:-translate-y-0.5 hover:text-foreground active:translate-y-0"
              >
                Sign out
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
