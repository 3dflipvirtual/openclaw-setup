"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <div
      className={`min-h-screen ${isLanding ? "bg-[#0a0a0a] text-white" : "bg-background text-foreground"}`}
    >
      {!isLanding && <SiteHeader />}
      <main>{children}</main>
      {!isLanding && <SiteFooter />}
    </div>
  );
}
