import React from "react";

const Halo = () => {
  return (
    <div className="relative flex items-center justify-center w-[min(500px,90vw)] h-[min(500px,90vw)]">
      {/* The Glow Layer */}
      <div className="absolute inset-0 rounded-full bg-orange-500/20 blur-[100px] animate-pulse" />

      {/* The Main SVG Ring */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-[0_0_15px_rgba(255,165,0,0.8)]"
      >
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffedd5" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ffedd5" />
          </linearGradient>
          {/* Noise texture for the stroke */}
          <filter id="static-noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="4"
              stitchTiles="stitch"
            />
            <feDisplacementMap in="SourceGraphic" scale="2" />
          </filter>
        </defs>

        {/* The Actual Ring */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="url(#ring-gradient)"
          strokeWidth="0.5"
          className="opacity-90"
          style={{ filter: "url(#static-noise)" }}
        />
      </svg>

      {/* Static/Noise Animation Overlay */}
      <div className="absolute inset-0 rounded-full border-[1px] border-orange-200/30 mix-blend-overlay animate-noise-drift" />
    </div>
  );
};

export default Halo;
