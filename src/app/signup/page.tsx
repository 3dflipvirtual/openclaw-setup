"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail } from "lucide-react";

import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    router.push("/onboarding");
  };

  const handleGoogleSignup = async () => {
    setError(null);
    setLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/onboarding`,
      },
    });
    setLoading(false);
    if (oauthError) {
      setError(oauthError.message);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-6xl items-center justify-center px-6 py-16">
      <AuthCard
        title="Create your OpenClaw Setup account"
        subtitle="It only takes a minute. Then we send you straight to checkout."
      >
        <form className="space-y-4" onSubmit={handleEmailSignup}>
          <div className="space-y-2">
            <label className="text-sm font-semibold" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster/30"
              placeholder="you@company.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster/30"
              placeholder="At least 8 characters"
            />
          </div>
          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <Button
            className="w-full"
            size="lg"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border/80" />
          or continue with
          <span className="h-px flex-1 bg-border/80" />
        </div>

        <Button
          variant="outline"
          className="w-full"
          size="lg"
          onClick={handleGoogleSignup}
          disabled={loading}
        >
          <Mail size={16} />
          Google
        </Button>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link className="font-semibold text-foreground" href="/login">
            Log in
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}
