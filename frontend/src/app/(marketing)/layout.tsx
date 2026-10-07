import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { AnnouncementBar } from "@/features/landing/AnnouncementBar";
import { DemoProvider } from "@/features/landing/DemoModal";
import { MarketingFooter } from "@/features/landing/MarketingFooter";
import { MarketingNav } from "@/features/landing/MarketingNav";
import { SupportChat } from "@/features/landing/SupportChat";
import "@/styles/marketing-tokens.css";

// Exposed as CSS variables; marketing-tokens.css puts them at the head of the font stacks.
const inter = Inter({ subsets: ["latin"], variable: "--mk-font-inter", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--mk-font-dm", display: "swap" });

// Static snippet (no user data). Scroll-reveal may only hide content once JS is known to run.
// It appends a <style> to <head> instead of touching <html>, whose attributes React would
// report as a hydration mismatch.
const JS_FLAG =
  'var s=document.createElement("style");s.textContent=".mk-root{--mk-reveal-opacity:0;--mk-reveal-shift:18px}";document.head.appendChild(s)';

export const metadata: Metadata = {
  title: "Fireflies.ai Clone | The #1 AI Assistant For Your Meetings",
  description: "Transcribe, summarize, search and analyze every meeting with an AI notetaker.",
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`mk-root min-h-screen ${inter.variable} ${dmSans.variable}`}>
      <script dangerouslySetInnerHTML={{ __html: JS_FLAG }} />
      <DemoProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-md focus:bg-[var(--mk-white)] focus:px-4 focus:py-2 focus:text-[var(--mk-ink)]"
        >
          Skip to content
        </a>
        <AnnouncementBar />
        <MarketingNav />
        <main id="main">{children}</main>
        <MarketingFooter />
        <SupportChat />
      </DemoProvider>
    </div>
  );
}
