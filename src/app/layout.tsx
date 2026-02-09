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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://open-clawbot.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Deploy Openclaw in seconds.",
    template: "%s | Open-clawbot.com",
  },
  description: "Deploy Openclaw in seconds.",
  keywords: [
    "OpenClaw",
    "Telegram bot",
    "AI agent",
    "deploy",
    "Open-clawbot",
    "chatbot",
    "automation",
  ],
  authors: [{ name: "Open-clawbot" }],
  creator: "Open-clawbot",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Open-clawbot.com",
    title: "Deploy Openclaw in seconds.",
    description: "Deploy Openclaw in seconds.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deploy Openclaw in seconds.",
    description: "Deploy Openclaw in seconds.",
  },
  robots: {
    index: true,
    follow: true,
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
        <div className="min-h-screen bg-background text-foreground">
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
