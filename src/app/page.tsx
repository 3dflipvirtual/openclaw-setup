import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  Shield,
  Sparkles,
  Zap,
  MessageCircle,
  Wand2,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="hero-glow">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-20 md:flex-row md:items-center">
        <div className="flex flex-1 flex-col gap-6">
          <span className="w-fit rounded-full border border-border/60 bg-background px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            What Siri should have been
          </span>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            What Siri Should Have Been — Finally 🦞
          </h1>
          <p className="text-lg text-muted md:text-xl">
            Your AI that actually does things: emails, bookings, files, home
            automation. Setup in 5 minutes, no code, no servers. Just text your
            lobster on Telegram.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/signup"
              className={buttonVariants({ size: "lg", className: "gap-2" })}
            >
              Get Your Lobster
              <Sparkles size={18} />
            </Link>
            <Link
              href="/#demo"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "gap-2",
              })}
            >
              Watch 30-sec demo
              <MessageCircle size={18} />
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-2">
              <Shield size={16} /> Your data stays private
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} /> 14-day refund
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-6">
          <div
            id="demo"
            className="glass-card flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-3xl p-6 text-center"
          >
            <span className="text-sm font-semibold text-muted">
              30-sec demo video
            </span>
            <div className="flex h-40 w-full items-center justify-center rounded-2xl border border-dashed border-border/80 bg-background/80 text-muted">
              Video placeholder
            </div>
            <p className="text-sm text-muted">
              See OpenClaw send emails, book meetings, and finish tasks while you
              sip coffee.
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card px-5 py-4">
            <Bot className="text-lobster" />
            <div>
              <p className="text-sm font-semibold">Real actions, not just chat</p>
              <p className="text-xs text-muted">
                Claude-powered agent with memory, tools, and approvals.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Zero hassle setup",
              copy: "Paste keys, click deploy, text your bot. We do the rest.",
              icon: <Zap className="text-lobster" />,
            },
            {
              title: "Private & secure",
              copy: "Encrypted keys, isolated agents, and approval flows.",
              icon: <Shield className="text-lobster" />,
            },
            {
              title: "Real actions",
              copy: "Emails, calendars, files, smart home — handled for you.",
              icon: <Wand2 className="text-lobster" />,
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="glass-card flex flex-col gap-4 rounded-3xl p-6"
            >
              <div className="flex items-center gap-3">
                {feature.icon}
                <h3 className="text-lg font-semibold">{feature.title}</h3>
              </div>
              <p className="text-sm text-muted">{feature.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto w-full max-w-6xl px-6 py-16"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">
              How it works
            </p>
            <h2 className="text-3xl font-bold md:text-4xl">
              Four guided steps, zero tech stress
            </h2>
          </div>
          <Link
            href="/onboarding"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Preview the wizard
          </Link>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-4">
          {[
            {
              step: "1",
              title: "Paste Claude key",
              copy: "We encrypt it instantly and never expose it.",
            },
            {
              step: "2",
              title: "Connect Telegram",
              copy: "Guided screenshots, copy-paste, done.",
            },
            {
              step: "3",
              title: "Pick integrations",
              copy: "Start with Telegram. Add Gmail later.",
            },
            {
              step: "4",
              title: "Deploy your lobster",
              copy: "One click to wake up your agent.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-3xl border border-border/60 bg-card p-6"
            >
              <p className="text-sm font-semibold text-lobster">
                Step {item.step}
              </p>
              <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="trust" className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr]">
          <div className="glass-card rounded-3xl p-8">
            <h2 className="text-2xl font-bold md:text-3xl">
              Magical UX, serious trust signals
            </h2>
            <ul className="mt-6 space-y-3 text-sm text-muted">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-1 text-lobster" />
                Your keys are encrypted and stored in a Supabase vault.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-1 text-lobster" />
                Approval flows stop risky actions before they happen.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-1 text-lobster" />
                14-day refund — if it is not magic, we fix it.
              </li>
            </ul>
          </div>
          <div className="rounded-3xl border border-border/60 bg-card p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">
              Testimonials
            </p>
            <div className="mt-6 space-y-6">
              <div>
                <p className="text-base font-semibold">
                  &quot;It booked three meetings while I slept.&quot;
                </p>
                <p className="text-sm text-muted">— Ava, founder</p>
              </div>
              <div>
                <p className="text-base font-semibold">
                  &quot;Felt like magic, no setup stress.&quot;
                </p>
                <p className="text-sm text-muted">— Liam, product lead</p>
              </div>
              <div>
                <p className="text-base font-semibold">
                  &quot;My Telegram bot now runs my inbox.&quot;
                </p>
                <p className="text-sm text-muted">— Jordan, creator</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="lobster-gradient flex flex-col items-center gap-4 rounded-3xl px-8 py-12 text-center text-white shadow-glow">
          <h2 className="text-3xl font-bold md:text-4xl">
            Ready to deploy your lobster?
          </h2>
          <p className="max-w-xl text-white/90">
            Sign up, pay once, and we handle the rest. Text your AI in Telegram
            while we keep it alive in the background.
          </p>
          <Link href="/signup" className={buttonVariants({ size: "lg" })}>
            Start now
          </Link>
        </div>
      </section>
    </div>
  );
}
