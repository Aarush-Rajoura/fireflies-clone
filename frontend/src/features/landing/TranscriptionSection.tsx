import { ROUTES, TRANSCRIPTION_FEATURES } from "./content";
import { FeatureItem } from "./FeatureItem";
import { Icon } from "./icons";
import { TranscriptPanel } from "./mockParts";
import { Reveal } from "./Reveal";
import { AccentHeading, ButtonLink, Container } from "./ui";

export function TranscriptionSection() {
  return (
    <section aria-labelledby="transcription-title" className="bg-[var(--mk-white)] py-20 sm:py-28">
      <Container className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-20">
        <Reveal>
          <AccentHeading
            id="transcription-title"
            text={"High Quality Meeting\n*Transcription* & *Recording*"}
            className="text-[32px] sm:text-[40px]"
          />
          <p className="mt-5 max-w-[520px] text-[17px] leading-relaxed text-[var(--mk-body)]">
            Fireflies records every call and turns it into an accurate, speaker-labelled transcript you can search,
            share and replay at the exact moment something was said.
          </p>
          <ButtonLink href={ROUTES.signup} arrow className="mt-8">
            Get Started
          </ButtonLink>
          <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2">
            {TRANSCRIPTION_FEATURES.map((f) => (
              <FeatureItem key={f.title} feature={f} />
            ))}
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="relative mx-auto max-w-[440px]">
            <div className="absolute -inset-3 rounded-[32px] sm:-inset-6 bg-[var(--mk-tint-lilac)]" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-xl border border-[var(--mk-line)] shadow-[0_20px_60px_var(--mk-shadow)]">
              <TranscriptPanel activeIndex={1} />
              <div className="flex items-center gap-3 border-t border-[var(--mk-line)] bg-[var(--mk-white)] px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--mk-violet)] text-[var(--mk-white)]">
                  <Icon name="play" filled size={14} />
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--mk-surface-2)]">
                  <div className="h-full w-[38%] rounded-full bg-[var(--mk-violet)]" />
                </div>
                <span className="text-[11px] tabular-nums text-[var(--mk-muted)]">12:48 / 34:52</span>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
