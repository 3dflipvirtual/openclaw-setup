import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "AI Personal Assistant — Your 24/7 AI in Telegram",
  description:
    "Get a personal AI assistant that lives in Telegram. It remembers your conversations, manages tasks, browses the web, and is always available — powered by OpenClaw.",
  alternates: {
    canonical: "/ai-personal-assistant",
  },
};

const faqs = [
  {
    q: "How is this different from ChatGPT?",
    a: "OpenClaw agents have persistent memory — they remember everything across conversations. They also run 24/7, can proactively follow up, and live right in Telegram where you already spend time.",
  },
  {
    q: "Can my AI assistant manage tasks and reminders?",
    a: "Yes. Tell your agent about deadlines, to-dos, and reminders through natural conversation. It tracks everything and can proactively follow up when things are due.",
  },
  {
    q: "Does it work in Telegram group chats?",
    a: "OpenClaw agents are designed for direct message conversations for now, giving you a private, persistent AI assistant experience.",
  },
  {
    q: "How much does an AI personal assistant cost?",
    a: "OpenClaw costs $29/month for a fully managed, always-on AI assistant with persistent memory, web browsing, and task management included.",
  },
];

export default function AiPersonalAssistantPage() {
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
        Your AI Personal Assistant — Always On, Always Learning
      </h1>
      <p className="mt-4 text-lg text-muted max-w-2xl">
        Imagine an assistant that never forgets, never sleeps, and lives right in
        Telegram. OpenClaw gives you a personal AI that remembers everything, handles
        research, and manages your tasks 24/7.
      </p>

      <Link
        href="/"
        className="mt-8 inline-block rounded-xl bg-lobster px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-105"
      >
        Get your AI assistant &rarr;
      </Link>

      <section className="mt-16 space-y-12">
        <div>
          <h2 className="text-2xl font-semibold">It Remembers Everything</h2>
          <p className="mt-3 text-muted leading-relaxed">
            Tell your assistant your preferences once — it remembers forever. Mention a
            project deadline on Monday, ask about it on Friday, and your agent recalls
            every detail. Over time, it builds a comprehensive understanding of your life,
            work, and priorities.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">
            Research Anything, Anytime
          </h2>
          <p className="mt-3 text-muted leading-relaxed">
            Need to compare products? Research a destination? Summarize a long article?
            Your AI assistant browses the web in real-time and delivers concise answers
            right in your Telegram chat. No tab switching, no copy-pasting — just ask.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">
            Lives Where You Already Are
          </h2>
          <p className="mt-3 text-muted leading-relaxed">
            No new app to download. No new interface to learn. Your AI assistant lives in
            Telegram — the messaging app you already use every day. Message it like you
            would a friend, and get intelligent, contextual responses back.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Proactive, Not Just Reactive</h2>
          <p className="mt-3 text-muted leading-relaxed">
            Your assistant doesn&apos;t just wait for commands. With configurable autonomy,
            it can proactively check in on your projects, remind you of deadlines, and
            surface relevant information when it matters most.
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
          Get your AI personal assistant &rarr;
        </Link>
      </div>
    </>
  );
}
