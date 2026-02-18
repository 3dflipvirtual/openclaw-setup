import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

import { Analytics } from "@vercel/analytics/next";

import { JsonLd } from "@/components/JsonLd";
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://open-clawbot.com";

const siteDescription =
  "Deploy an autonomous AI agent on Telegram in 60 seconds. OpenClaw remembers conversations, browses the web, manages tasks, and runs 24/7 — no code required.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "OpenClaw — Deploy Your Autonomous AI Agent on Telegram",
    template: "%s | OpenClaw",
  },
  description: siteDescription,
  keywords: [
    "OpenClaw",
    "telegram ai bot",
    "autonomous ai agent",
    "deploy ai agent",
    "ai personal assistant",
    "telegram chatbot",
    "ai agent platform",
    "no code ai bot",
    "ai customer support bot",
    "self-running ai agent",
  ],
  authors: [{ name: "OpenClaw" }],
  creator: "OpenClaw",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "OpenClaw",
    title: "OpenClaw — Deploy Your Autonomous AI Agent on Telegram",
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenClaw — Deploy Your Autonomous AI Agent on Telegram",
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
      >
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "OpenClaw",
            url: siteUrl,
            logo: `${siteUrl}/favicon.png`,
            description: siteDescription,
          }}
        />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "OpenClaw",
            operatingSystem: "Telegram",
            applicationCategory: "BusinessApplication",
            description: siteDescription,
            url: siteUrl,
            offers: {
              "@type": "Offer",
              price: "29",
              priceCurrency: "USD",
              priceValidUntil: "2027-12-31",
            },
          }}
        />
        <div className="min-h-screen bg-background text-foreground">
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </div>
        <Analytics />
      </body>
    </html>
  );
}
