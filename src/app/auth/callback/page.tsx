"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase/client";

const AUTH_MESSAGE_TYPE = "supabase-auth";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    const isOpener = typeof window !== "undefined" && window.opener != null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";

    async function sendSessionToOpener() {
      const code = searchParams.get("code");

      // If we have a code (PKCE), send it to opener so it can exchange (opener has code_verifier)
      if (code && isOpener) {
        try {
          window.opener.postMessage(
            { type: AUTH_MESSAGE_TYPE, code },
            origin
          );
          setStatus("done");
          window.close();
        } catch {
          setStatus("error");
        }
        return;
      }

      if (code && !isOpener) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setStatus("error");
          router.replace("/");
          return;
        }
      } else if (!code) {
        // Hash-based (implicit) flow: give client time to parse hash
        await new Promise((r) => setTimeout(r, 150));
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        setStatus("error");
        if (!isOpener) {
          router.replace("/");
        }
        return;
      }

      if (isOpener) {
        try {
          window.opener.postMessage(
            {
              type: AUTH_MESSAGE_TYPE,
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            },
            origin
          );
          setStatus("done");
          window.close();
        } catch {
          setStatus("error");
        }
      } else {
        router.replace("/");
      }
    }

    sendSessionToOpener();
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
