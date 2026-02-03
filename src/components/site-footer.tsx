import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="font-semibold text-foreground">OpenClaw Setup</p>
          <p>What Siri should have been, now with a lobster. 🦞</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link href="/#features" className="hover:text-foreground">
            Features
          </Link>
          <Link href="/#how-it-works" className="hover:text-foreground">
            How it works
          </Link>
          <Link href="/#trust" className="hover:text-foreground">
            Trust & safety
          </Link>
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
        </div>
      </div>
    </footer>
  );
}
