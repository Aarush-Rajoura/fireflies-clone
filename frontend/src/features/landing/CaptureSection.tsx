import { CAPTURE_FEATURES, CAPTURE_HIGHLIGHTS, INTEGRATIONS } from "./content";
import { FeatureItem } from "./FeatureItem";
import { Icon } from "./icons";
import { BrandMark, PlaceholderMark } from "./marks";
import { Reveal } from "./Reveal";
import { AccentHeading, Container } from "./ui";

const TINT = { lilac: "bg-[var(--mk-tint-lilac)]", cream: "bg-[var(--mk-tint-cream)]" } as const;

/** Abstract "person on camera" drawn with CSS shapes in place of a stock photo. */
function Participant({ name, tone }: { name: string; tone: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--mk-secondary)]">
      <div className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(80% 70% at 30% 20%, ${tone}, transparent 70%)` }} />
      <div className="absolute bottom-0 left-1/2 h-[46%] w-[58%] -translate-x-1/2 rounded-t-full bg-[var(--mk-navy-raised)]" />
      <div className="absolute bottom-[40%] left-1/2 aspect-square w-[16%] -translate-x-1/2 rounded-full bg-[var(--mk-on-dark-faint)]" />
      <span className="absolute bottom-2 left-2 rounded bg-[var(--mk-scrim)] px-1.5 py-0.5 text-[10px] text-[var(--mk-on-dark)]">{name}</span>
    </div>
  );
}

function BotIllustration() {
  return (
    <div className="relative mt-6 h-[200px] overflow-hidden rounded-xl sm:h-[220px]">
      <Participant name="Janice" tone="var(--mk-tone-3)" />
      <div className="absolute right-3 top-3 flex w-[190px] items-center gap-2 rounded-lg bg-[var(--mk-white)] p-2.5 shadow-[0_8px_24px_var(--mk-shadow-strong)]">
        <Icon name="calendar" size={16} className="text-[var(--mk-tone-5)]" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-[var(--mk-ink)]">Sales Demo</p>
          <p className="text-[10px] text-[var(--mk-muted)]">Janice, +2</p>
        </div>
        <span aria-hidden="true" className="flex h-4 w-7 items-center justify-end rounded-full bg-[var(--mk-violet)] px-0.5">
          <span className="h-3 w-3 rounded-full bg-[var(--mk-white)]" />
        </span>
      </div>
      <div className="absolute bottom-3 right-3 flex h-[92px] w-[150px] flex-col items-center justify-center gap-2 rounded-lg bg-[var(--mk-white-14)] backdrop-blur">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--mk-white-14)]">
          <BrandMark size={20} />
        </span>
        <span className="text-[10px] text-[var(--mk-on-dark)]">Janice&apos;s Fireflies Notetaker</span>
      </div>
      <div className="absolute left-3 top-3 flex gap-1.5 rounded-md bg-[var(--mk-navy)] p-1.5">
        {INTEGRATIONS.slice(0, 4).map((it) => (
          <PlaceholderMark key={it.name} shape={it.shape} tone={it.tone} size={16} />
        ))}
      </div>
    </div>
  );
}

function ExtensionIllustration() {
  return (
    <div className="relative mt-6 h-[200px] sm:h-[220px]">
      <div className="absolute inset-y-0 left-0 w-[70%] overflow-hidden rounded-xl bg-[var(--mk-navy)] p-2">
        <div className="h-[62%] overflow-hidden rounded-lg ring-2 ring-[var(--mk-tone-5)]">
          <Participant name="Michael" tone="var(--mk-tone-4)" />
        </div>
        <div className="mx-auto mt-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mk-tone-5)] text-lg font-semibold text-[var(--mk-white)]">
          M
        </div>
      </div>
      <div className="absolute right-0 top-[44%] w-[62%] max-w-[230px]">
        <span className="inline-flex items-center gap-1 rounded bg-[var(--mk-green)] px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[var(--mk-navy)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--mk-navy)]" /> TRANSCRIBING
        </span>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-[var(--mk-white)] p-2.5 shadow-[0_8px_24px_var(--mk-shadow-strong)]">
          <Icon name="calendar" size={16} className="text-[var(--mk-tone-5)]" />
          <div className="flex-1">
            <p className="flex items-center gap-1 text-[11px] font-medium text-[var(--mk-ink)]">
              Sales Demo <span className="h-1.5 w-1.5 rounded-full bg-[var(--mk-red)]" />
            </p>
            <p className="text-[10px] tabular-nums text-[var(--mk-muted)]">02:14</p>
          </div>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--mk-tint-pink)]">
            <span className="h-2 w-2 rounded-sm bg-[var(--mk-red)]" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function CaptureSection() {
  return (
    <section aria-labelledby="capture-title" className="bg-[var(--mk-surface)] py-20 sm:py-28">
      <Container>
        <Reveal>
          <AccentHeading
            id="capture-title"
            text="*Capture* Meetings *Anywhere* & Anytime"
            className="text-center text-[32px] sm:text-[44px]"
          />
        </Reveal>
        <div className="mx-auto mt-14 grid max-w-[1000px] gap-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          {CAPTURE_HIGHLIGHTS.map((card, i) => (
            <Reveal key={card.title} delay={i * 90}>
              <article className={`h-full rounded-2xl p-5 sm:p-6 ${TINT[card.tint]}`}>
                <h3 className="text-[17px] font-medium text-[var(--mk-ink)]">{card.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--mk-body)]">{card.body}</p>
                {i === 0 ? <BotIllustration /> : <ExtensionIllustration />}
              </article>
            </Reveal>
          ))}
        </div>
        <div className="mx-auto mt-14 grid max-w-[1000px] gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {CAPTURE_FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <FeatureItem feature={f} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
