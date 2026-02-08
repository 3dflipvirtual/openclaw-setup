"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase/client";

const AUTH_MESSAGE_TYPE = "supabase-auth";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "done" | "error" | "close-manually">("loading");

  useEffect(() => {
    // Check if this is a popup - window.opener can be null after cross-origin redirects
    // We also check if this window was opened as a popup by checking window.name
    const hasOpener = typeof window !== "undefined" && window.opener != null;
    const isPopup = typeof window !== "undefined" && (
      hasOpener ||
      window.name === "google-signin" ||
      window.opener !== null
    );
    const origin = typeof window !== "undefined" ? window.location.origin : "";

    async function handleAuthCallback() {
      const code = searchParams.get("code");

      // POPUP FLOW: We have a code and this appears to be a popup window
      if (code && hasOpener) {
        try {
          window.opener.postMessage(
            { type: AUTH_MESSAGE_TYPE, code },
            origin
          );
          setStatus("done");
          // Close immediately so browser allows it (tied to opener's user gesture)
          window.close();
          setTimeout(() => setStatus("close-manually"), 500);
        } catch (err) {
          console.error("Failed to send auth message to opener:", err);
          setStatus("error");
        }
        return;
      }

      // POPUP WITHOUT OPENER: Cross-origin redirects can clear window.opener.
      // Use BroadcastChannel to send auth result to opener, then close.
      if (code && isPopup && !hasOpener) {
        const authChannel = searchParams.get("auth_channel");
        if (authChannel && typeof BroadcastChannel !== "undefined") {
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              console.error("Code exchange failed:", error);
              setStatus("error");
              return;
            }
            const channel = new BroadcastChannel(`supabase-auth-${authChannel}`);
            if (data.session) {
              channel.postMessage({
                type: AUTH_MESSAGE_TYPE,
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
              });
            } else {
              channel.postMessage({ type: AUTH_MESSAGE_TYPE, code });
            }
            channel.close();
            setStatus("done");
            window.close();
            setTimeout(() => setStatus("close-manually"), 500);
          } catch (err) {
            console.error("Auth callback error:", err);
            setStatus("error");
          }
        } else {
          try {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              console.error("Code exchange failed:", error);
              setStatus("error");
              return;
            }
            setStatus("close-manually");
          } catch (err) {
            console.error("Auth callback error:", err);
            setStatus("error");
          }
        }
        return;
      }

      // REDIRECT FLOW: Not a popup, handle normally
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("Code exchange failed in redirect flow:", error);
          setStatus("error");
          setTimeout(() => router.replace("/"), 2000);
          return;
        }
        router.replace("/");
        return;
      }

      // No code - might be implicit/hash-based flow
      await new Promise((r) => setTimeout(r, 150));

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        setStatus("error");
        if (!isPopup) {
          setTimeout(() => router.replace("/"), 2000);
        }
        return;
      }

      // We have a session
      if (hasOpener) {
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
          setTimeout(() => setStatus("close-manually"), 500);
        } catch (err) {
          console.error("Failed to send session to opener:", err);
          setStatus("close-manually");
        }
      } else if (isPopup) {
        // Popup but no opener - session is set, ask user to close
        setStatus("close-manually");
      } else {
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
      {status === "close-manually" && (
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-emerald-600">✓ Signed in successfully!</p>
          <p className="text-sm text-muted">You can close this window and refresh the original page.</p>
        </div>
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
