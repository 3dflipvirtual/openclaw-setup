import Link from "next/link";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Logo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className={buttonVariants({ size: "sm" })}>
            Log in
          </Link>
          <Link
            href="/signup"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
