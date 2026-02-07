import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-lg flex-col items-center justify-center gap-8 px-6 py-20">
      <h1 className="text-center text-2xl font-bold">OpenClaw</h1>
      <p className="text-center text-sm text-muted">
        Connect your Telegram bot and deploy your AI agent.
      </p>
      <div className="flex gap-3">
        <Link href="/login" className={buttonVariants({ size: "lg" })}>
          Log in
        </Link>
        <Link
          href="/signup"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
