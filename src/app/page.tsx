"use client";

import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ScrollSequencer from "@/components/ScrollSequencer";

export default function Home() {
  const router = useRouter();

  const handleDeploy = () => {
    router.push("/app");
  };

  const handleTokenSubmit = () => {
    router.push("/app");
  };

  const handleNewsletter = () => {
    router.push("/app");
  };

  return (
    <>
      <div className="film-grain" aria-hidden />
      <Navbar />
      <ScrollSequencer
        onDeploy={handleDeploy}
        onTokenSubmit={handleTokenSubmit}
        onNewsletter={handleNewsletter}
      />
    </>
  );
}
