import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Telegram AI Bot — Deploy a Smart AI Chatbot on Telegram",
  description:
    "Create and deploy an AI-powered Telegram bot that remembers conversations, browses the web, and runs 24/7. No coding required — set up in 60 seconds with OpenClaw.",
  alternates: {
    canonical: "/telegram-ai-bot",
  },
};

const faqs = [
  {
    q: "How do I create an AI bot on Telegram?",
    a: "With OpenClaw, you create a bot via Telegram's @BotFather, paste the token into our dashboard, choose a personality, and click Deploy. Your AI bot is live in under 60 seconds.",
  },
  {
    q: "Does the Telegram AI bot remember previous conversations?",
    a: "Yes. OpenClaw agents have persistent memory — they remember every conversation and build context over time, unlike traditional chatbots that reset with each session.",
  },
  {
    q: "Can my Telegram AI bot browse the internet?",
    a: "Absolutely. OpenClaw agents have a built-in web browser. They can research topics, read articles, check facts, and bring information directly into your Telegram chat.",
  },
  {
    q: "Is the bot always online?",
    a: "Yes. Your bot runs as a persistent daemon on dedicated cloud infrastructure. It responds instantly, 24 hours a day, 7 days a week.",
  },
  {
    q: "Do I need to know how to code?",
    a: "No coding required. OpenClaw is designed for non-technical users. The entire setup is point-and-click through a web dashboard.",
  },
];

export default function TelegramAiBotPage() {
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
        Deploy a Telegram AI Bot in 60 Seconds
      </h1>
      <p className="mt-4 text-lg text-muted max-w-2xl">
        Turn Telegram into your most powerful tool. OpenClaw lets you create an AI-powered
        bot that remembers everything, browses the web, and works around the clock — no
        coding required.
      </p>

      <Link
        href="/"
        className="mt-8 inline-block rounded-xl bg-lobster px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-105"
      >
        Get started free &rarr;
      </Link>

      <section className="mt-16 space-y-12">
        <div>
          <h2 className="text-2xl font-semibold">
            More Than a Chatbot — An Autonomous Agent
          </h2>
          <p className="mt-3 text-muted leading-relaxed">
            Traditional Telegram bots follow rigid command scripts. OpenClaw is different.
            Your bot is a fully autonomous AI agent that understands context, maintains
            memory across conversations, and can take initiative. Ask it to research a
            topic, manage your tasks, or draft content — it handles everything
            conversationally.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">
            Persistent Memory That Grows With You
          </h2>
          <p className="mt-3 text-muted leading-relaxed">
            Every conversation enriches your bot&apos;s understanding. It remembers your
            preferences, ongoing projects, important dates, and past discussions. Unlike
            stateless chatbots that forget everything, your OpenClaw agent builds a
            personal knowledge base over time.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Built-In Web Browsing</h2>
          <p className="mt-3 text-muted leading-relaxed">
            Your Telegram AI bot can browse the internet in real-time. Need a summary of
            the latest news? Want to compare products? Need to verify a fact? Just ask —
            your agent opens a browser, finds the information, and reports back in your
            chat.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Set Up in Under a Minute</h2>
          <p className="mt-3 text-muted leading-relaxed">
            Create a bot with Telegram&apos;s @BotFather, paste the token into OpenClaw,
            pick a personality, and hit deploy. That&apos;s it. Your AI agent starts
            responding to messages immediately — running 24/7 on dedicated infrastructure.
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
          Deploy your Telegram AI bot now &rarr;
        </Link>
      </div>
    </>
  );
}
