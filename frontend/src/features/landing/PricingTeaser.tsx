import Link from "next/link";
import { ROUTES } from "./content";
import { Icon } from "./icons";
import { PricingCards } from "./PricingCards";
import { Reveal } from "./Reveal";
import { AccentHeading, Container } from "./ui";

export function PricingTeaser() {
  return (
    <section aria-labelledby="pricing-teaser-title" className="bg-[var(--mk-surface)] py-20 sm:py-28">
      <Container>
        <Reveal className="text-center">
          <AccentHeading id="pricing-teaser-title" text="Plans For *Every Team*" className="text-[32px] sm:text-[44px]" />
          <p className="mx-auto mt-4 max-w-[520px] text-[17px] text-[var(--mk-body)]">
            Start free and upgrade when your team is ready. No credit card required.
          </p>
        </Reveal>
        <div className="mt-10">
          <PricingCards />
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
