import { HERO, ROUTES } from "./content";
import { DemoButton } from "./DemoModal";
import { Icon } from "./icons";
import { LogoStrip } from "./LogoStrip";
import { ProductMock } from "./ProductMock";
import { ButtonLink, Container } from "./ui";

function RatingPill() {
  return (
    <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-t-xl bg-[var(--mk-pill)] px-4 py-2.5 text-[13px] text-[var(--mk-on-dark-muted)] sm:px-5 sm:text-[15px]">
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden="true"
          className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--mk-tone-6)] text-[11px] font-bold text-[var(--mk-white)]"
        >
          R
        </span>
        {HERO.rating}
        <span
          className="inline-flex text-[var(--mk-star)]"
          role="img"
          aria-label="4.8 out of 5 stars"
        >
          {[0, 1, 2, 3].map((i) => (
            <Icon key={i} name="star" filled size={18} />
          ))}
          <Icon name="star" filled size={18} className="text-[var(--mk-star-off)]" />
        </span>
      </span>
      <span aria-hidden="true" className="hidden h-4 w-px bg-[var(--mk-on-dark-faint)] sm:block" />
      <span className="inline-flex items-center gap-1.5">
        <Icon name="lock" size={16} />
        {HERO.compliance}
      </span>
    </div>
  );
}

/** Dark hero: headline, CTAs, rating pill, the product mock-up and the customer strip. */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="mk-starfield relative overflow-hidden">
      <Container className="pb-14 pt-14 text-center sm:pt-20 lg:pt-24">
        {/* Above the fold: CSS-only entrance so the headline never waits on JS. */}
        <div className="mk-rise">
          <h1
            id="hero-title"
            className="mk-display mx-auto max-w-[820px] text-[40px] font-medium leading-[1.12] text-[var(--mk-on-dark)] sm:text-[56px] lg:text-[68px]"
          >
            {HERO.title}
          </h1>
          <p className="mx-auto mt-6 max-w-[720px] text-[15px] leading-relaxed text-[var(--mk-on-dark-muted)] sm:text-[18px]">
            {HERO.subtitle}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <ButtonLink href={ROUTES.signup} size="lg" arrow className="w-full sm:w-auto">
              Get Started
            </ButtonLink>
            <DemoButton variant="secondary" size="lg" className="w-full sm:w-auto" />
          </div>
        </div>

        <div className="mk-rise mt-14 [animation-delay:150ms] sm:mt-20">
          <RatingPill />
          <ProductMock />
        </div>

        <LogoStrip />
      </Container>
    </section>
  );
}
