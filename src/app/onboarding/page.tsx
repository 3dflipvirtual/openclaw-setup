"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  Bot,
  ShieldAlert,
  Send,
  KeyRound,
  MessageCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase/client";

const steps = ["AI engine", "Connect Telegram", "Add integrations", "Deploy your agent"];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [gmailEnabled, setGmailEnabled] = useState(false);
  const [calendarEnabled, setCalendarEnabled] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [savingStep, setSavingStep] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [telegramCode, setTelegramCode] = useState<string | null>(null);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramChecking, setTelegramChecking] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramConnectLoading, setTelegramConnectLoading] = useState(false);
  const [telegramConnectError, setTelegramConnectError] = useState<string | null>(null);
  const [telegramBotUsername, setTelegramBotUsername] = useState<string | null>(null);
  const [telegramDisconnecting, setTelegramDisconnecting] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }

      const profileResponse = await fetch("/api/profile");
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        setIsPaid(Boolean(profile?.paid));
        if (
          typeof profile?.onboardingStep === "number" &&
          profile.onboardingStep > currentStep
        ) {
          setCurrentStep(
            Math.min(profile.onboardingStep, steps.length - 1)
          );
        }
      }

      setCheckingAuth(false);
    };
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const progress = useMemo(
    () => Math.round(((currentStep + 1) / steps.length) * 100),
    [currentStep]
  );

  useEffect(() => {
    if (currentStep === 1 && !telegramCode) {
      loadTelegramCode();
    }
    if (currentStep === 1) {
      refreshTelegramStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const deployAgent = async () => {
    setDeploying(true);
    setDeploySuccess(false);
    setDeployError(null);
    const response = await fetch("/api/deploy", { method: "POST" });

    if (response.status === 402) {
      router.push("/paywall?return=/onboarding");
      return;
    }

    if (!response.ok) {
      setDeploying(false);
      const payload = await response.json().catch(() => ({}));
      setDeployError(payload?.error ?? "We hit a snag. Please try again.");
      return;
    }

    setDeploying(false);
    setDeploySuccess(true);
  };

  const loadTelegramCode = async () => {
    setTelegramChecking(true);
    const response = await fetch("/api/telegram/link-code", { method: "POST" });
    const payload = await response.json();
    setTelegramChecking(false);
    if (response.ok) {
      setTelegramCode(payload?.code ?? null);
      setTelegramLinked(Boolean(payload?.verified));
    }
  };

  const refreshTelegramStatus = async () => {
    setTelegramChecking(true);
    const response = await fetch("/api/telegram/link-status");
    const payload = await response.json();
    setTelegramChecking(false);
    if (response.ok) {
      setTelegramLinked(Boolean(payload?.verified));
      if (payload?.code) setTelegramCode(payload.code);
      if (payload?.botUsername) setTelegramBotUsername(payload.botUsername);
    }
  };

  const disconnectTelegram = async () => {
    setTelegramDisconnecting(true);
    const response = await fetch("/api/telegram/disconnect", { method: "POST" });
    setTelegramDisconnecting(false);
    if (response.ok) {
      setTelegramCode(null);
      setTelegramBotUsername(null);
      setTelegramLinked(false);
    }
  };

  const connectTelegramBot = async () => {
    const token = telegramBotToken.trim();
    if (!token) {
      setTelegramConnectError("Enter your bot token from @BotFather.");
      return;
    }
    setTelegramConnectLoading(true);
    setTelegramConnectError(null);
    const response = await fetch("/api/telegram/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const payload = await response.json();
    setTelegramConnectLoading(false);
    if (!response.ok) {
      setTelegramConnectError(payload?.error ?? "Failed to connect bot. Try again.");
      return;
    }
    setTelegramCode(payload?.code ?? null);
    setTelegramBotUsername(payload?.botUsername ?? null);
    setTelegramBotToken("");
    setTelegramLinked(false);
  };

  const saveStep = async () => {
    setSavingStep(true);
    setSaveError(null);

    if (currentStep === 0) {
      const response = await fetch("/api/onboarding/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "claude_key" }),
      });
      if (!response.ok) {
        const payload = await response.json();
        setSaveError(payload?.error ?? "Could not save your key.");
        setSavingStep(false);
        return false;
      }
    }

    if (currentStep === 1) {
      const response = await fetch("/api/onboarding/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "telegram_link" }),
      });
      if (!response.ok) {
        const payload = await response.json();
        setSaveError(payload?.error ?? "Please link Telegram to continue.");
        setSavingStep(false);
        return false;
      }
    }

    if (currentStep === 2) {
      const response = await fetch("/api/onboarding/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "integrations",
          metadata: {
            integrations: {
              telegram: true,
              gmail: gmailEnabled,
              calendar: calendarEnabled,
            },
          },
        }),
      });
      if (!response.ok) {
        const payload = await response.json();
        setSaveError(payload?.error ?? "Could not save integrations.");
        setSavingStep(false);
        return false;
      }
    }

    setSavingStep(false);
    return true;
  };

  const handleNext = async () => {
    if (currentStep === steps.length - 1) return;
    const ok = await saveStep();
    if (ok) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  if (checkingAuth) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-5xl items-center justify-center px-6 py-16">
        <div className="flex items-center gap-3 text-sm text-muted">
          <Loader2 className="animate-spin" size={16} />
          Checking your account...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16">
      <div className="mb-10 flex flex-col gap-4">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            Step {currentStep + 1} of {steps.length}
          </span>
          <span>{progress}% complete</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-border/40">
          <div
            className="h-full rounded-full bg-lobster transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <h1 className="text-3xl font-bold">
          {steps[currentStep]} {currentStep === 3 ? "🦞" : ""}
        </h1>
        <p className="text-muted">
          We guide you line by line so you never need a terminal or server.
        </p>
      </div>

      <div className="glass-card rounded-3xl p-8">
        {currentStep === 0 ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="text-xl font-semibold">
                  OpenClaw AI is already powered up
                </h2>
                <p className="text-sm text-muted">
                  We use our secure Claude key to run your agent. No extra setup
                  required.
                </p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Why this?
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Your key stays private</DialogTitle>
                    <DialogDescription>
                      We store your Claude API key in an encrypted vault. It is
                      only used to run actions you approve.
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background px-4 py-4 text-sm">
              <div className="flex items-center gap-3">
                <KeyRound className="text-lobster" size={18} />
                <div>
                  <p className="font-semibold">MiniMax M2.1 already enabled</p>
                  <p className="text-muted">
                    We use our shared MiniMax Coding Plan so you do not need
                    to bring keys. Strict rate limits keep things safe.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4 text-sm text-muted">
              <p className="font-semibold text-foreground">
                Need help finding your key?
              </p>
              <p>
                Watch the 45-second walkthrough or open the screenshot guide.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button variant="outline" size="sm">
                  Watch video
                </Button>
                <Button variant="ghost" size="sm">
                  View screenshots
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {currentStep === 1 ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="text-xl font-semibold">Connect Telegram</h2>
                <p className="text-sm text-muted">
                  Use your own bot so there are no shared limits. Create one in
                  Telegram with @BotFather, then paste the token here.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1 text-xs text-muted">
                <ShieldAlert size={14} />
                Your token is encrypted and never shared
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background px-4 py-4 text-sm">
              <label className="flex flex-col gap-2 font-semibold">
                <span className="flex items-center gap-2">
                  <Bot size={16} className="text-lobster" />
                  Telegram Bot Token
                </span>
                <input
                  type="password"
                  placeholder="123456789:ABCdefGHI..."
                  value={telegramBotToken}
                  onChange={(e) => {
                    setTelegramBotToken(e.target.value);
                    setTelegramConnectError(null);
                  }}
                  className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm font-normal placeholder:text-muted"
                />
              </label>
              <p className="mt-2 text-xs text-muted">
                Get this from @BotFather in Telegram (Bot Settings → API Token).
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={connectTelegramBot}
                disabled={telegramConnectLoading}
              >
                {telegramConnectLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    Connecting...
                  </>
                ) : (
                  "Connect my bot"
                )}
              </Button>
              {telegramConnectError ? (
                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {telegramConnectError}
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-dashed border-border/80 bg-background/80 p-4 text-sm text-muted">
              After connecting, send the code below to your bot in Telegram to
              link this account.
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background px-4 py-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-semibold">
                  <MessageCircle size={16} className="text-lobster" />
                  Link code
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadTelegramCode}
                  disabled={telegramChecking}
                >
                  {telegramCode ? "Refresh" : "Get code"}
                </Button>
              </div>
              <div className="rounded-xl border border-border/60 bg-background px-3 py-2 text-center text-lg font-semibold">
                {telegramCode ?? "Connect your bot first"}
              </div>
              <p className="text-xs text-muted">
                {telegramBotUsername
                  ? `Send this code to ${telegramBotUsername} in Telegram.`
                  : "After connecting your bot, a code will appear here."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshTelegramStatus}
                disabled={telegramChecking}
              >
                {telegramChecking ? "Checking..." : "I've sent the code"}
              </Button>
              {(telegramLinked || telegramBotUsername) ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={disconnectTelegram}
                  disabled={telegramDisconnecting}
                >
                  {telegramDisconnecting ? "Disconnecting..." : "Disconnect"}
                </Button>
              ) : null}
              {telegramLinked ? (
                <span className="text-xs font-semibold text-emerald-600">
                  Connected
                </span>
              ) : null}
            </div>
            {saveError ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {saveError}
              </p>
            ) : null}
          </div>
        ) : null}

        {currentStep === 2 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Add integrations</h2>
              <p className="text-sm text-muted">
                Start simple. You can add Gmail and Calendar later.
              </p>
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm">
              <input type="checkbox" checked readOnly />
              Telegram (required)
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={gmailEnabled}
                onChange={(event) => setGmailEnabled(event.target.checked)}
              />
              Gmail (OAuth setup)
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={calendarEnabled}
                onChange={(event) => setCalendarEnabled(event.target.checked)}
              />
              Google Calendar
            </label>
            <p className="text-xs text-muted">
              We will request these permissions only after you finish setup.
            </p>
          </div>
        ) : null}

        {currentStep === 3 ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="text-xl font-semibold">Deploy your agent</h2>
                <p className="text-sm text-muted">
                  We pull the OpenClaw repo, inject your keys, and deploy your
                  isolated worker.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1 text-xs text-muted">
                <Bot size={14} />
                Cloudflare Moltworker
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4 text-sm text-muted">
              <p className="font-semibold text-foreground">Deploy summary</p>
              <ul className="mt-2 space-y-1">
                <li>Model: MiniMax M2.1 (shared)</li>
                <li>Telegram: {telegramLinked ? "Connected" : "Missing"}</li>
                <li>
                  Integrations:{" "}
                  {gmailEnabled || calendarEnabled
                    ? "Gmail, Calendar"
                    : "None yet"}
                </li>
              </ul>
              <p className="mt-3 text-xs text-muted">
                After paying for Workers Paid and R2 on Cloudflare, click Deploy
                so your worker receives your Telegram bot token and can reply in
                Telegram.
              </p>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={deployAgent}
              disabled={deploying}
            >
              {deploying ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Waking up your lobster...
                </>
              ) : (
                <>
                  {isPaid ? "Deploy now" : "Pay to deploy"}
                  <Sparkles size={16} />
                </>
              )}
            </Button>
            {deployError ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {deployError}
              </p>
            ) : null}
            {deploySuccess ? (
              <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                <div className="absolute right-4 top-4 flex gap-1" aria-hidden="true">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-lobster" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-lobster [animation-delay:120ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-lobster [animation-delay:240ms]" />
                </div>
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 size={16} />
                  Ready! Text your bot on Telegram to talk to OpenClaw.
                </div>
                <div className="mt-2 flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/dashboard")}
                  >
                    Go to dashboard
                  </Button>
                  <Button variant="ghost" size="sm">
                    Send me a confirmation email
                    <Send size={14} />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
          disabled={currentStep === 0}
        >
          Back
        </Button>
        <Button
          size="sm"
          onClick={handleNext}
          disabled={currentStep === steps.length - 1 || savingStep}
        >
          {savingStep ? "Saving..." : "Next"}
        </Button>
      </div>
    </div>
  );
}
