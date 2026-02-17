import Link from "next/link";

const seoPages = [
  { href: "/telegram-ai-bot", label: "Telegram AI Bot" },
  { href: "/deploy-ai-agent", label: "Deploy AI Agent" },
  { href: "/ai-personal-assistant", label: "AI Personal Assistant" },
  { href: "/ai-customer-support-bot", label: "AI Customer Support" },
  { href: "/autonomous-ai-agent", label: "Autonomous AI Agent" },
];

export default function SeoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      {children}

      <nav className="mt-20 border-t border-border/60 pt-10">
        <p className="mb-4 text-sm font-medium text-muted">Explore more</p>
        <div className="flex flex-wrap gap-3">
          {seoPages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="rounded-full border border-border/60 px-4 py-2 text-sm text-muted transition-colors hover:border-lobster/40 hover:text-foreground"
            >
              {page.label}
            </Link>
          ))}
        </div>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-lobster hover:underline"
          >
            &larr; Back to OpenClaw
          </Link>
        </div>
      </nav>
    </div>
  );
}
