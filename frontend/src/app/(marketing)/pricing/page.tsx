import type { Metadata } from "next";
import { FaqSection } from "@/features/landing/FaqSection";
import { PricingCards } from "@/features/landing/PricingCards";
import { AccentHeading, Container } from "@/features/landing/ui";

export const metadata: Metadata = {
  title: "Pricing | Fireflies.ai Clone",
  description: "Free, Pro, Business and Enterprise plans for AI meeting notes.",
};

export default function PricingPage() {
  return (
    <>
      <section
        aria-labelledby="pricing-title"
        className="mk-starfield pb-40 pt-16 text-center sm:pt-24"
      >
        <Container>
          <AccentHeading
            as="h1"
            id="pricing-title"
            dark
            text="Simple Pricing For *Every Team*"
            className="text-[38px] sm:text-[56px]"
          />
          <p className="mx-auto mt-5 max-w-[560px] text-[17px] leading-relaxed text-[var(--mk-on-dark-muted)] sm:text-[19px]">
            Start free with unlimited transcription. Upgrade for unlimited summaries, storage and
            conversation intelligence.
          </p>
        </Container>
      </section>
      <section aria-label="Plans" className="flow-root bg-[var(--mk-surface)] pb-20">
        <Container className="-mt-28">
          <PricingCards />
          <p className="mt-8 text-center text-[14px] text-[var(--mk-muted)]">
            Prices in USD. Taxes may apply. Cancel any time.
          </p>
        </Container>
      </section>
      <FaqSection />
    </>
  );
}
