import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AnnouncementBar } from "@/features/landing/AnnouncementBar";
import { DemoProvider } from "@/features/landing/DemoModal";
import { MarketingFooter } from "@/features/landing/MarketingFooter";
import { MarketingNav } from "@/features/landing/MarketingNav";
import { SupportChat } from "@/features/landing/SupportChat";
import "@/styles/marketing-tokens.css";

export const metadata: Metadata = {
  title: "Fireflies.ai Clone | The #1 AI Assistant For Your Meetings",
  description: "Transcribe, summarize, search and analyze every meeting with an AI notetaker.",
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mk-root min-h-screen">
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
