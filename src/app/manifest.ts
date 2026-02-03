import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OpenClaw Setup",
    short_name: "OpenClaw",
    description: "Deploy your OpenClaw AI agent in minutes.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ff4500",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
