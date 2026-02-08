"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Halo from "./Halo";

const USE_CASES = [
  "Organize your inbox",
  "Schedule meetings from chat",
  "Plan your week",
  "Price-drop alerts",
  "Negotiate deals",
];

function InitialHero({
  onNewsletter,
  onTokenSubmit,
}: {
  onNewsletter?: () => void;
  onTokenSubmit?: (token: string) => void;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white">
        Open-Clawbot
      </h1>
      <form
        className="flex flex-col sm:flex-row gap-2 justify-center"
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.querySelector<HTMLInputElement>("input");
          if (input?.value && onTokenSubmit) onTokenSubmit(input.value);
          else if (onNewsletter) onNewsletter();
        }}
      >
        <input
          name="token"
          className="bg-white/5 border border-white/10 rounded-full px-6 py-3 text-white w-64 focus:outline-none focus:ring-1 ring-orange-500 placeholder:text-white/40"
          placeholder="Enter your telegram bot token..."
        />
        <button
          type="button"
          onClick={onNewsletter}
          className="bg-white text-black font-bold px-8 py-3 rounded-full hover:bg-orange-500 transition-colors"
        >
          Join newsletter
        </button>
      </form>
      <p className="text-white/40 uppercase tracking-[0.3em] text-xs">
        AI. Without the noise.
      </p>
    </div>
  );
}

function FinalCTA({
  onDeploy,
  onTokenSubmit,
}: {
  onDeploy?: () => void;
  onTokenSubmit?: (token: string) => void;
}) {
  return (
    <div className="space-y-8 flex flex-col items-center" id="usecases">
      <h2 className="text-3xl md:text-5xl font-bold text-white max-w-2xl text-center">
        Deploy Openclaw in seconds
      </h2>
      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.querySelector("input");
          if (input?.value && onTokenSubmit) onTokenSubmit(input.value);
          else if (onDeploy) onDeploy();
        }}
      >
        <input
          name="token"
          className="bg-white/5 border border-white/10 rounded-full px-5 py-2.5 text-white w-56 text-sm focus:outline-none focus:ring-1 ring-orange-500 placeholder:text-white/40"
          placeholder="Enter your telegram bot token"
        />
        <button
          type="submit"
          className="bg-white text-black font-bold px-6 py-2.5 rounded-full text-sm hover:bg-orange-500 transition-colors"
        >
          Deploy
        </button>
      </form>
      <div className="pt-12 w-full max-w-2xl">
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-4 text-center">
          One assistant, thousands of use cases
        </p>
        <div className="overflow-hidden">
          <div className="flex gap-8 animate-ticker">
            {[...USE_CASES, ...USE_CASES].map((useCase, i) => (
              <span
                key={i}
                className="text-white font-bold text-sm whitespace-nowrap grayscale opacity-60"
              >
                {useCase}
              </span>
            ))}
          </div>
        </div>
        <p className="text-white/40 text-xs mt-4 text-center">
          You can make your own use case
        </p>
      </div>
    </div>
  );
}

function ScrollStep({
  scrollYProgress,
  start,
  end,
  children,
}: {
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  start: number;
  end: number;
  children: React.ReactNode;
}) {
  const opacity = useTransform(
    scrollYProgress,
    [start, start + 0.05, end - 0.05, end],
    [0, 1, 1, 0]
  );
  const y = useTransform(
    scrollYProgress,
    [start, start + 0.05, end - 0.05, end],
    [20, 0, 0, -20]
  );
  return (
    <motion.div
      style={{ opacity, y }}
      className="absolute inset-0 flex items-center justify-center"
    >
      {children}
    </motion.div>
  );
}

export default function ScrollSequencer({
  onNewsletter,
  onDeploy,
  onTokenSubmit,
}: {
  onNewsletter?: () => void;
  onDeploy?: () => void;
  onTokenSubmit?: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const steps = 5;
  const stepSize = 1 / steps;

  return (
    <div
      ref={containerRef}
      className="relative h-[500vh] bg-[#0a0a0a]"
      id="home"
    >
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden">
        {/* The Halo & Tree Background */}
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <div className="relative">
            <Halo />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/tree.png"
              alt=""
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 opacity-40 mix-blend-multiply pointer-events-none"
            />
          </div>
        </div>

        {/* Animated Text Layers */}
        <div className="relative z-10 text-center px-6 max-w-4xl w-full">
          <ScrollStep scrollYProgress={scrollYProgress} start={0} end={stepSize}>
            <InitialHero
              onNewsletter={onNewsletter}
              onTokenSubmit={onTokenSubmit}
            />
          </ScrollStep>
          <ScrollStep
            scrollYProgress={scrollYProgress}
            start={stepSize}
            end={stepSize * 2}
          >
            <h2 id="mission" className="text-4xl md:text-6xl font-bold tracking-tighter text-white leading-tight">
              Autonomous Personal Assistant & Task Management
            </h2>
          </ScrollStep>
          <ScrollStep
            scrollYProgress={scrollYProgress}
            start={stepSize * 2}
            end={stepSize * 3}
          >
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-white leading-tight">
              Developer & DevOps Automation
            </h2>
          </ScrollStep>
          <ScrollStep
            scrollYProgress={scrollYProgress}
            start={stepSize * 3}
            end={stepSize * 4}
          >
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-white leading-tight">
              Proactive Business & Operations Agent
            </h2>
          </ScrollStep>
          <ScrollStep
            scrollYProgress={scrollYProgress}
            start={stepSize * 4}
            end={1}
          >
            <FinalCTA onDeploy={onDeploy} onTokenSubmit={onTokenSubmit} />
          </ScrollStep>
        </div>
      </div>
    </div>
  );
}
