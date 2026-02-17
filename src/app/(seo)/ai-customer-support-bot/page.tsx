import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "AI Customer Support Bot — Automate Support on Telegram",
  description:
    "Deploy an AI customer support bot on Telegram that handles inquiries 24/7, remembers customer context, and never misses a message. Powered by OpenClaw.",
  alternates: {
    canonical: "/ai-customer-support-bot",
  },
};

const faqs = [
  {
    q: "Can the bot handle complex customer questions?",
    a: "Yes. OpenClaw agents are powered by advanced AI models that understand nuance and context. They can handle multi-step inquiries, reference previous conversations, and provide detailed, accurate responses.",
  },
  {
    q: "Does the support bot remember returning customers?",
    a: "Absolutely. Persistent memory means your bot remembers every customer interaction. When a customer returns, the bot knows their history, preferences, and previous issues.",
  },
  {
    q: "Can I customize the bot's responses for my business?",
    a: "Yes. Choose a personality preset or configure a custom one. You can define your bot's tone, knowledge base, and how it handles different types of inquiries.",
  },
  {
    q: "What if the bot can't answer a question?",
    a: "You can configure your agent to gracefully handle edge cases — acknowledging limitations and directing customers to human support when needed.",
  },
];

export default function AiCustomerSupportBotPage() {
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
        AI Customer Support Bot for Telegram
      </h1>
      <p className="mt-4 text-lg text-muted max-w-2xl">
        Stop losing customers to slow response times. Deploy an AI support agent on
        Telegram that handles inquiries instantly, remembers customer context, and works
        24/7 — without hiring more staff.
      </p>

      <Link
        href="/"
        className="mt-8 inline-block rounded-xl bg-lobster px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-105"
      >
        Deploy your support bot &rarr;
      </Link>

      <section className="mt-16 space-y-12">
        <div>
          <h2 className="text-2xl font-semibold">Instant Responses, Every Time</h2>
          <p className="mt-3 text-muted leading-relaxed">
            Customers expect fast answers. Your OpenClaw support bot responds in seconds,
            not hours. Whether it&apos;s 3 AM on a Sunday or during a product launch
            surge, your bot handles every inquiry without delays.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">
            Remembers Every Customer Interaction
          </h2>
          <p className="mt-3 text-muted leading-relaxed">
            No more &quot;can you repeat your issue?&quot; moments. Your support bot
            maintains persistent memory of every conversation. Returning customers get
            personalized responses based on their full history — building trust and
            reducing resolution time.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">
            Research and Verify in Real-Time
          </h2>
          <p className="mt-3 text-muted leading-relaxed">
            Your bot can browse your documentation, check product availability, or verify
            information on the web — all within the conversation. Customers get accurate,
            up-to-date answers without being put on hold.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">
            Fraction of the Cost of Human Agents
          </h2>
          <p className="mt-3 text-muted leading-relaxed">
            At $29/month, an OpenClaw support bot costs less than an hour of a human
            agent&apos;s time — and it works around the clock. Scale your support without
            scaling your team.
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
          Automate your customer support &rarr;
        </Link>
      </div>
    </>
  );
}
