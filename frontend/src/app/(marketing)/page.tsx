import { CaptureSection } from "@/features/landing/CaptureSection";
import { FaqSection } from "@/features/landing/FaqSection";
import { FinalCta } from "@/features/landing/FinalCta";
import { Hero } from "@/features/landing/Hero";
import { IntegrationsGrid } from "@/features/landing/IntegrationsGrid";
import { IntelligenceSection } from "@/features/landing/IntelligenceSection";
import { LiveAssistBanner } from "@/features/landing/LiveAssistBanner";
import { PricingTeaser } from "@/features/landing/PricingTeaser";
import { SearchSection } from "@/features/landing/SearchSection";
import { SecuritySection } from "@/features/landing/SecuritySection";
import { SummariesSection } from "@/features/landing/SummariesSection";
import { TranscriptionSection } from "@/features/landing/TranscriptionSection";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <TranscriptionSection />
      <SummariesSection />
      <CaptureSection />
      <SearchSection />
      <LiveAssistBanner />
      <IntelligenceSection />
      <IntegrationsGrid />
      <SecuritySection />
      <PricingTeaser />
      <FaqSection />
      <FinalCta />
    </>
  );
}
