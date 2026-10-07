import { ROUTES } from "./content";
import { DemoButton } from "./DemoModal";
import { BrandMark } from "./marks";
import { Reveal } from "./Reveal";
import { AccentHeading, ButtonLink, Container } from "./ui";

export function FinalCta() {
  return (
    <section aria-labelledby="final-cta-title" className="mk-starfield py-16 text-center sm:py-24">
      <Container>
        <Reveal>
          <span className="mk-pulse mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--mk-navy-raised)] ring-1 ring-[var(--mk-violet)]">
            <BrandMark size={32} />
          </span>
          <AccentHeading
            id="final-cta-title"
            dark
            text={"Never Take Meeting Notes\n*Again*"}
            className="mt-6 text-[30px] sm:text-[44px]"
          />
          <p className="mx-auto mt-4 max-w-[520px] text-[15px] leading-relaxed text-[var(--mk-on-dark-muted)]">
            Join over a million companies that let Fireflies record, transcribe and summarize their
            conversations.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <ButtonLink href={ROUTES.signup} size="lg" arrow className="w-full sm:w-auto">
              Get Started
            </ButtonLink>
            <DemoButton variant="secondary" size="lg" className="w-full sm:w-auto" />
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
