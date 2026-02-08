import React from "react";

const Halo = () => {
  return (
    <div className="relative flex items-center justify-center w-[min(500px,90vw)] h-[min(500px,90vw)]">
      {/* 
        LAYER 1: The Core "Ignition" Ring
        Sharp, bright orange ring that pulses slightly.
      */}
      <div className="absolute inset-0 rounded-full border-[1px] border-orange-400 opacity-60 blur-[1px] animate-pulse-slow" />

      {/* 
        LAYER 2: Inner Radiance
        Soft, diffusing orange glow pulling inwards.
      */}
      <div className="absolute inset-4 rounded-full bg-orange-500/10 blur-[40px] animate-breathe" />

      {/* 
        LAYER 3: Outer Corona
        Expansive, fiery red/orange glow that drifts.
      */}
      <div className="absolute inset-[-20%] rounded-full bg-gradient-to-tr from-orange-600/20 via-red-500/20 to-transparent blur-[80px] animate-drift-slow mix-blend-screen" />

      {/* 
        LAYER 4: White-Hot Center Detail
        Subtle white highlights to simulate intense heat.
      */}
      <div className="absolute inset-0 rounded-full border-[1px] border-white/20 opacity-30 blur-[0.5px] scale-[0.98]" />

      {/* The Main SVG Ring - Refined Gradient */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full drop-shadow-[0_0_25px_rgba(255,100,0,0.6)]"
      >
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffeba1" /> {/* White-hot yellow */}
            <stop offset="40%" stopColor="#ff5e00" /> {/* Intense Orange */}
            <stop offset="100%" stopColor="#a30000" /> {/* Deep Red */}
          </linearGradient>
          <filter id="static-noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="4"
              stitchTiles="stitch"
            />
            <feDisplacementMap in="SourceGraphic" scale="3" />
          </filter>
        </defs>

        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="url(#ring-gradient)"
          strokeWidth="0.6"
          className="opacity-90 mix-blend-lighten"
          style={{ filter: "url(#static-noise)" }}
        />
      </svg>

      {/* 
        LAYER 5: Ethereal Noise Drift 
        Subtle texture moving over the ring.
      */}
      <div className="absolute inset-[-10%] rounded-full border-[1px] border-orange-200/10 mix-blend-overlay animate-noise-drift pointer-events-none" />
    </div>
  );
};

export default Halo;
