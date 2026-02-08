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
    <div className="space-y-8 relative z-10">
      {/* Staggered Entrance for Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-5xl md:text-8xl font-bold tracking-tighter text-white drop-shadow-2xl"
      >
        Open-Clawbot
      </motion.h1>

      {/* Staggered Entrance for Form */}
      <motion.form
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        className="flex flex-col sm:flex-row gap-3 justify-center items-center"
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.querySelector<HTMLInputElement>("input");
          if (input?.value && onTokenSubmit) onTokenSubmit(input.value);
          else if (onNewsletter) onNewsletter();
        }}
      >
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <input
            name="token"
            className="relative bg-black/40 border border-white/10 backdrop-blur-xl rounded-full px-8 py-4 text-white w-72 sm:w-80 focus:outline-none focus:ring-1 ring-orange-400/50 placeholder:text-white/30 text-sm transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)]"
            placeholder="Enter your telegram bot token..."
          />
        </div>

        <button
          type="button"
          onClick={onNewsletter}
          className="relative bg-white text-black font-semibold px-8 py-4 rounded-full hover:bg-neutral-200 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)] text-sm tracking-tight"
        >
          Join newsletter
        </button>
      </motion.form>

      {/* Staggered Entrance for Tagline */}
      <motion.p
        initial={{ opacity: 0, letterSpacing: "0.1em" }}
        animate={{ opacity: 0.5, letterSpacing: "0.3em" }}
        transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
        className="text-white uppercase text-xs font-medium"
      >
        AI. Without the noise.
      </motion.p>
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
      <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white max-w-2xl text-center drop-shadow-lg">
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
          className="bg-white/5 border border-white/10 rounded-full px-5 py-2.5 text-white w-56 text-sm focus:outline-none focus:ring-1 ring-orange-500/50 placeholder:text-white/30 backdrop-blur-md"
          placeholder="Enter your telegram bot token"
        />
        <button
          type="submit"
          className="bg-white text-black font-bold px-6 py-2.5 rounded-full text-sm hover:bg-neutral-200 transition-colors shadow-lg"
        >
          Deploy
        </button>
      </form>
      <div className="pt-12 w-full max-w-2xl">
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-4 text-center">
          One assistant, thousands of use cases
        </p>
        <div className="overflow-hidden mask-linear-fade">
          <div className="flex gap-8 animate-ticker">
            {[...USE_CASES, ...USE_CASES].map((useCase, i) => (
              <span
                key={i}
                className="text-white font-medium text-sm whitespace-nowrap opacity-50 hover:opacity-100 transition-opacity"
              >
                {useCase}
              </span>
            ))}
          </div>
        </div>
        <p className="text-white/40 text-xs mt-4 text-center tracking-wide">
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
  isFirst = false,
  isLast = false,
}: {
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  start: number;
  end: number;
  children: React.ReactNode;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  // First step: start at opacity 1, fade out normally
  // Last step: fade in normally, stay at opacity 1
  // Middle steps: fade in and out
  const opacityValues = isFirst
    ? [1, 1, 1, 0]
    : isLast
      ? [0, 1, 1, 1]
      : [0, 1, 1, 0];

  const yValues = isFirst
    ? [0, 0, 0, -20]
    : isLast
      ? [20, 0, 0, 0]
      : [20, 0, 0, -20];

  const opacity = useTransform(
    scrollYProgress,
    [start, start + 0.05, end - 0.05, end],
    opacityValues
  );
  const y = useTransform(
    scrollYProgress,
    [start, start + 0.05, end - 0.05, end],
    yValues
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
          <ScrollStep scrollYProgress={scrollYProgress} start={0} end={stepSize} isFirst>
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
            isLast
          >
            <FinalCTA onDeploy={onDeploy} onTokenSubmit={onTokenSubmit} />
          </ScrollStep>
        </div>
      </div>
    </div>
  );
}
