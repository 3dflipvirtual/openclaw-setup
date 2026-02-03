import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenClaw Setup | What Siri Should Have Been",
  description:
    "Set up your OpenClaw AI agent in minutes. No servers. No code. Just paste a key and text your lobster in Telegram.",
  metadataBase: new URL("https://openclaw-setup.com"),
  openGraph: {
    title: "OpenClaw Setup",
    description:
      "Your Claude-powered AI agent that actually does things. Setup in 5 minutes, no code.",
    url: "https://openclaw-setup.com",
    siteName: "OpenClaw Setup",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenClaw Setup",
    description:
      "What Siri should have been. Deploy OpenClaw in minutes and chat via Telegram.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
      >
        <div className="min-h-screen bg-background text-foreground">
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
