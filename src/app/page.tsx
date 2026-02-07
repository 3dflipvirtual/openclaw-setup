"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { HeroSignInStep } from "@/components/onboarding/hero-sign-in-step";
import { ConnectTelegramStep } from "@/components/onboarding/connect-telegram-step";
import { VerificationStep } from "@/components/onboarding/verification-step";
import { DeployStep } from "@/components/onboarding/deploy-step";
import { Button } from "@/components/ui/button";

// API Response Types
type ProfileResponse = { paid?: boolean };
type LinkStatusResponse = { verified?: boolean; code?: string };
type ConnectResponse = { code?: string; error?: string };
type LinkCodeResponse = { code?: string; verified?: boolean };
type DeployResponse = { error?: string };

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Telegram State
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramConnecting, setTelegramConnecting] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [telegramCode, setTelegramCode] = useState<string | null>(null);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramChecking, setTelegramChecking] = useState(false);

  // Deploy State
  const [deploying, setDeploying] = useState(false);
  const [deployDone, setDeployDone] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);

  // Step Management
  const [step, setStep] = useState(0);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ? { id: data.user.id } : null);

      if (data.user) {
        // Fetch User Profile & Link Status
        const [pr, ls] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/telegram/link-status"),
        ]);

        if (pr.ok) {
          const p = (await pr.json()) as ProfileResponse;
          setIsPaid(Boolean(p?.paid));
        }

        if (ls.ok) {
          const l = (await ls.json()) as LinkStatusResponse;
          const verified = Boolean(l?.verified);
          setTelegramLinked(verified);
          if (l?.code) setTelegramCode(l.code);

          // Determine Step
          if (verified) {
            setStep(4); // Deploy
          } else if (l?.code) {
            setStep(3); // Verify
          } else {
            setStep(2); // Connect
          }
        } else {
          setStep(2); // Default to Connect if status fails or no link
        }
      } else {
        setStep(1); // Hero/Login
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
    setStep(1);
    setTelegramToken("");
  };

  const connectBot = async () => {
    const token = telegramToken.trim();
    if (!token) {
      setTelegramError("Please enter a bot token");
      return;
    }
    setTelegramConnecting(true);
    setTelegramError(null);

    try {
      const res = await fetch("/api/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as ConnectResponse;

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to connect bot");
      }

      setTelegramCode(data?.code ?? null);
      setTelegramToken("");
      setStep(3); // Move to Verification
    } catch (err: any) {
      setTelegramError(err.message);
    } finally {
      setTelegramConnecting(false);
    }
  };

  const getCode = async () => {
    setTelegramChecking(true);
    const res = await fetch("/api/telegram/link-code", { method: "POST" });
    const data = (await res.json()) as LinkCodeResponse;
    setTelegramChecking(false);
    if (res.ok) {
      setTelegramCode(data?.code ?? null);
      setTelegramLinked(Boolean(data?.verified));
      if (data?.verified) {
        setStep(4);
      }
    }
  };

  const checkLinked = async () => {
    setTelegramChecking(true);
    const res = await fetch("/api/telegram/link-status");
    const data = (await res.json()) as LinkStatusResponse;
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
      setStep(4); // Move to Deploy
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
      const data = (await res.json().catch(() => ({}))) as DeployResponse;
      setDeployError(data?.error ?? "Deployment failed");
      setDeploying(false);
      return;
    }

    setDeployDone(true);
    setDeploying(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background/95 to-primary/5 text-foreground overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] -z-10 opacity-20" />

      {/* Header / Logout */}
      {user && (
        <header className="absolute top-4 right-4 z-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-muted-foreground hover:text-foreground"
          >
            Sign out
          </Button>
        </header>
      )}

      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative z-10 w-full max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" className="w-full">
              <HeroSignInStep onSignIn={signInGoogle} />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" className="w-full">
              <ConnectTelegramStep
                token={telegramToken}
                setToken={setTelegramToken}
                onSubmit={connectBot}
                isLoading={telegramConnecting}
                error={telegramError}
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" className="w-full">
              <VerificationStep
                code={telegramCode || "Loading..."} // Should have code here
                checkLinked={checkLinked}
                getCode={getCode}
                isChecking={telegramChecking}
                onBack={() => setStep(2)}
              />
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" className="w-full">
              <DeployStep
                onDeploy={deploy}
                isPaid={isPaid}
                isDeploying={deploying}
                deployError={deployError}
                deployDone={deployDone}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Optional Footer/Progress could go here */}
    </div>
  );
}
