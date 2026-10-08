import {
  CaptureSection,
  FaqSection,
  FinalCta,
  Hero,
  IntegrationsGrid,
  IntelligenceSection,
  LiveAssistBanner,
  PricingTeaser,
  SearchSection,
  SecuritySection,
  SummariesSection,
  TranscriptionSection,
} from "@/features/landing";

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
