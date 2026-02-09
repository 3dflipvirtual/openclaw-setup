import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Open-clawbot.com",
    short_name: "Open-clawbot",
    description: "Deploy Openclaw in seconds.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b0e",
    theme_color: "#FF5F1F",
    icons: [
      {
        src: "/favicon.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
