import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Autonomous AI Agent — Self-Running AI That Works 24/7",
  description:
    "Deploy an autonomous AI agent that runs independently, remembers context, browses the web, and takes initiative — all from Telegram. Powered by OpenClaw.",
  alternates: {
    canonical: "/autonomous-ai-agent",
  },
};

const faqs = [
  {
    q: "What makes an AI agent 'autonomous'?",
    a: "An autonomous AI agent doesn't just respond to prompts — it maintains persistent state, takes initiative, remembers context, uses tools independently, and operates continuously without human intervention.",
  },
  {
    q: "How is OpenClaw different from other AI agent platforms?",
    a: "OpenClaw is built for simplicity. No coding, no complex configurations, no server management. Deploy in 60 seconds and get a fully autonomous agent with memory, web browsing, and task management built in.",
  },
  {
    q: "Can the agent take actions on its own?",
    a: "Yes. OpenClaw agents have configurable autonomy levels. They can proactively follow up on tasks, send reminders, and take initiative based on conversation context.",
  },
  {
    q: "What AI models power OpenClaw agents?",
    a: "OpenClaw supports MiniMax, Anthropic Claude, and OpenAI models. Use the platform's default key or bring your own API keys for full control.",
  },
  {
    q: "Is my data secure?",
    a: "Each agent runs on isolated infrastructure. Your conversations and memory are dedicated to your agent instance and not shared with other users.",
  },
];

export default function AutonomousAiAgentPage() {
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
        Autonomous AI Agent — Deploy a Self-Running AI
      </h1>
      <p className="mt-4 text-lg text-muted max-w-2xl">
        Not a chatbot. Not an assistant. A truly autonomous AI agent that runs
        independently, remembers everything, takes initiative, and works around the clock
        — deployed in 60 seconds on Telegram.
      </p>

      <Link
        href="/"
        className="mt-8 inline-block rounded-xl bg-lobster px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-105"
      >
        Deploy your autonomous agent &rarr;
      </Link>

      <section className="mt-16 space-y-12">
        <div>
          <h2 className="text-2xl font-semibold">
            Beyond Chat — True Autonomy
          </h2>
          <p className="mt-3 text-muted leading-relaxed">
            Most AI tools wait for you to type a prompt. OpenClaw agents operate
            independently. They maintain persistent state, use tools autonomously, browse
            the web when they need information, and can proactively reach out when
            something needs your attention. This is AI that works for you, not just with
            you.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">
            Persistent Memory — Context That Lasts
          </h2>
          <p className="mt-3 text-muted leading-relaxed">
            Autonomous agents need memory to be truly useful. OpenClaw agents remember
            every conversation, learn your preferences, and build context over weeks and
            months. The longer you use your agent, the more valuable it becomes — like a
            colleague who never forgets.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Built-In Tools and Capabilities</h2>
          <p className="mt-3 text-muted leading-relaxed">
            Your agent comes equipped with web browsing, task management, and research
            tools out of the box. No integrations to set up, no APIs to connect. It can
            read web pages, manage to-do lists, track deadlines, and synthesize
            information — all autonomously.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">
            Always Running, Always Available
          </h2>
          <p className="mt-3 text-muted leading-relaxed">
            Your agent runs as a persistent daemon on dedicated cloud infrastructure. It
            doesn&apos;t spin up when you message it and shut down when you leave — it
            runs continuously, processing information and staying ready to respond
            instantly at any hour.
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
          Deploy your autonomous AI agent &rarr;
        </Link>
      </div>
    </>
  );
}
