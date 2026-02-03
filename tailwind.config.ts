import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        lobster: "var(--lobster)",
        muted: "var(--muted)",
        card: "var(--card)",
        border: "var(--border)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-geist-sans)", "var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        glow: "0 28px 80px rgba(255, 69, 0, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
