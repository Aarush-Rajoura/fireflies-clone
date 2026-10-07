import Link from "next/link";
import { ROUTES } from "./content";
import { Icon } from "./icons";
import { PricingCards } from "./PricingCards";
import { Reveal } from "./Reveal";
import { AccentHeading, Container } from "./ui";

export function PricingTeaser() {
  return (
    <section
      id="pricing-teaser"
      aria-labelledby="pricing-teaser-title"
      className="scroll-mt-4 bg-[var(--mk-surface)] py-14 sm:py-20"
    >
      <Container>
        <Reveal className="text-center">
          <AccentHeading
            id="pricing-teaser-title"
            text="Plans For *Every Team*"
            className="text-[28px] sm:text-[38px]"
          />
          <p className="mx-auto mt-4 max-w-[520px] text-[15px] text-[var(--mk-body)]">
            Start free and upgrade when your team is ready. No credit card required.
          </p>
        </Reveal>
        <div className="mt-10">
          <PricingCards compact />
        </div>
        <p className="mt-10 text-center">
          <Link
            href={ROUTES.pricing}
            className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[var(--mk-link)] hover:underline"
          >
            Compare all plans <Icon name="arrow-right" size={18} />
          </Link>
        </p>
      </Container>
    </section>
  );
}
