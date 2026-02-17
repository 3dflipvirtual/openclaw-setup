import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Deploy an AI Agent — No Code, Live in 60 Seconds",
  description:
    "Deploy your own autonomous AI agent with zero coding. OpenClaw handles hosting, memory, and tools — you just paste a token and click deploy.",
  alternates: {
    canonical: "/deploy-ai-agent",
  },
};

const faqs = [
  {
    q: "How do I deploy an AI agent without coding?",
    a: "OpenClaw provides a web dashboard where you paste a Telegram bot token, choose a personality, and click Deploy. No command line, no hosting setup, no code.",
  },
  {
    q: "Where does my AI agent run?",
    a: "Your agent runs as a persistent daemon on dedicated cloud infrastructure managed by OpenClaw. It stays online 24/7 without you managing any servers.",
  },
  {
    q: "Can I customize my agent's behavior?",
    a: "Yes. Choose from personality presets (Operator, Friendly, Professional, Minimal) or bring your own configuration. You control how your agent communicates and what it can do.",
  },
  {
    q: "What happens if I need more capacity?",
    a: "Your subscription includes a base token allocation. If you need more, purchase token recharges directly from the dashboard — credits are added instantly.",
  },
];

export default function DeployAiAgentPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />

      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Deploy an AI Agent — No Code Required
      </h1>
      <p className="mt-4 text-lg text-muted max-w-2xl">
        Stop wrestling with APIs, hosting, and infrastructure. OpenClaw lets you deploy a
        fully autonomous AI agent in 60 seconds — just paste a token and click deploy.
      </p>

      <Link
        href="/"
        className="mt-8 inline-block rounded-xl bg-lobster px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-105"
      >
        Deploy your agent &rarr;
      </Link>

      <section className="mt-16 space-y-12">
        <div>
          <h2 className="text-2xl font-semibold">
            From Zero to Running Agent in Three Steps
          </h2>
          <p className="mt-3 text-muted leading-relaxed">
            1. Create a Telegram bot and copy the token. 2. Paste it into OpenClaw and
            pick a personality. 3. Click Deploy. Your agent is live, running on dedicated
            infrastructure, ready to handle messages. The entire process takes under a
            minute.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">
            We Handle the Infrastructure
          </h2>
          <p className="mt-3 text-muted leading-relaxed">
            No servers to manage, no Docker containers to configure, no uptime to monitor.
            OpenClaw runs your agent as a persistent daemon on cloud infrastructure with
            automatic restarts, logging, and health monitoring. You focus on what your
            agent does — we keep it running.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">
            Built-In Memory, Browser, and Tools
          </h2>
          <p className="mt-3 text-muted leading-relaxed">
            Every agent comes with persistent memory, web browsing capabilities, and task
            management out of the box. No plugins to install, no integrations to build.
            Your agent remembers conversations, researches the web, and manages tasks from
            day one.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Bring Your Own Keys or Use Ours</h2>
          <p className="mt-3 text-muted leading-relaxed">
            OpenClaw works with MiniMax, Anthropic Claude, and OpenAI models. Use the
            platform&apos;s default key to get started instantly, or bring your own API
            keys for full control over model selection and costs.
          </p>
        </div>
      </section>

      <section className="mt-20">
        <h2 className="text-2xl font-semibold mb-8">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {faqs.map((faq) => (
            <div key={faq.q} className="border-b border-border/60 pb-6">
              <h3 className="font-medium">{faq.q}</h3>
              <p className="mt-2 text-muted text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-16 text-center">
        <Link
          href="/"
          className="inline-block rounded-xl bg-lobster px-8 py-4 text-base font-semibold text-white transition-transform hover:scale-105"
        >
          Start deploying now &rarr;
        </Link>
      </div>
    </>
  );
}
