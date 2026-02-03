import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/#features" className="text-muted hover:text-foreground">
            Features
          </Link>
          <Link href="/#how-it-works" className="text-muted hover:text-foreground">
            How it works
          </Link>
          <Link href="/#trust" className="text-muted hover:text-foreground">
            Trust
          </Link>
          <Link href="/dashboard" className="text-muted hover:text-foreground">
            Dashboard
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/signup"
            className={buttonVariants({ size: "sm", className: "gap-2" })}
          >
            Get Your Lobster
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}
