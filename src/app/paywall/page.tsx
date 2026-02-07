"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CreditCard } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";

const whopCheckoutUrl =
  process.env.NEXT_PUBLIC_WHOP_CHECKOUT_URL ??
  "https://whop.com/checkout/openclaw-setup";

function PaywallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return") ?? "/";
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center justify-center px-6 py-16">
      <div className="glass-card flex w-full flex-col gap-6 rounded-3xl p-8 text-center">
        <h1 className="text-3xl font-bold">Checkout to deploy</h1>
        <div className="flex flex-col items-center gap-3">
          <Link
            href={whopCheckoutUrl}
            className={buttonVariants({ size: "lg" })}
          >
            <CreditCard size={16} />
            Checkout
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setConfirming(true);
              await fetch("/api/paywall/confirm", { method: "POST" });
              router.push(returnTo);
            }}
            disabled={confirming}
          >
            {confirming ? "Confirming..." : "I paid — deploy"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PaywallPage() {
  return (
    <Suspense fallback={<div className="px-6 py-16 text-center">Loading…</div>}>
      <PaywallContent />
    </Suspense>
  );
}
