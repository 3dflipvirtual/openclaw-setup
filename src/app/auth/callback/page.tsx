"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    async function handleAuthCallback() {
      const code = searchParams.get("code");
      if (!code) {
        setStatus("error");
        return;
      }
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("Code exchange failed:", error);
        setStatus("error");
        return;
      }
      setStatus("done");
      window.close();
      if (!window.closed) {
        router.replace("/");
      }
    }
    handleAuthCallback();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6">
      {status === "loading" && (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-muted" />
          <p className="text-sm text-muted">Completing sign-in…</p>
        </>
      )}
      {status === "error" && (
        <p className="text-sm text-red-600">Sign-in failed. You can close this window.</p>
      )}
      {status === "done" && (
        <p className="text-sm text-muted">Signed in. Closing…</p>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
