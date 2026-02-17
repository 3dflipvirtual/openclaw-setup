import Link from "next/link";

const footerLinks = [
  { href: "/telegram-ai-bot", label: "Telegram AI Bot" },
  { href: "/deploy-ai-agent", label: "Deploy AI Agent" },
  { href: "/ai-personal-assistant", label: "AI Personal Assistant" },
  { href: "/ai-customer-support-bot", label: "AI Customer Support Bot" },
  { href: "/autonomous-ai-agent", label: "Autonomous AI Agent" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          made with love by{" "}
          <a
            href="https://oddshoes.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/70 underline decoration-border underline-offset-2 transition-colors hover:text-foreground"
          >
            oddshoes.dev
          </a>
        </p>
      </div>
    </footer>
  );
}
