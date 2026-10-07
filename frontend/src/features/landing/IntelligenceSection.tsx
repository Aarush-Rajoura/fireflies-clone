import { INTELLIGENCE_POINTS, ROUTES, TALK_TIME } from "./content";
import { FeatureItem } from "./FeatureItem";
import { Avatar, toneVar } from "./marks";
import { Reveal } from "./Reveal";
import { AccentHeading, ButtonLink, Container } from "./ui";

// Relative sentiment per call segment: positive bars point up, negative down.
const SENTIMENT = [4, 6, 3, -2, 5, 7, -3, 4, 6, 8, 2, -1, 5, 6];
const TOPICS = [
  { label: "Pricing", count: 12 },
  { label: "Integrations", count: 9 },
  { label: "Timeline", count: 6 },
  { label: "Competitors", count: 3 },
];

function AnalyticsMock() {
  return (
    <div className="rounded-xl border border-[var(--mk-line)] bg-[var(--mk-white)] p-5 text-left shadow-[0_20px_60px_var(--mk-shadow)] sm:p-6">
      <p className="text-[13px] font-medium text-[var(--mk-ink)]">Speaker talk time</p>
      <ul className="mt-3 space-y-3">
        {TALK_TIME.map((s) => (
          <li key={s.name} className="flex items-center gap-3 text-[12px]">
            <Avatar name={s.name} tone={s.tone} size={20} />
            <span className="w-12 text-[var(--mk-body)]">{s.name}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--mk-surface-2)]">
              <span
                className="block h-full rounded-full"
                style={{ width: `${s.share}%`, background: toneVar(s.tone) }}
              />
            </span>
            <span className="w-9 text-right tabular-nums text-[var(--mk-muted)]">{s.share}%</span>
          </li>
        ))}
      </ul>

      <p className="mt-7 text-[13px] font-medium text-[var(--mk-ink)]">Sentiment over the call</p>
      <div
        className="relative mt-3 flex h-24 gap-1.5"
        role="img"
        aria-label="Mostly positive sentiment with three brief dips"
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-[var(--mk-line)]" />
        {SENTIMENT.map((v, i) => (
          <span key={i} className="flex h-full flex-1 flex-col">
            <span className="flex flex-1 items-end">
              {v > 0 && (
                <span
                  className="w-full rounded-t-sm bg-[var(--mk-tone-4)]"
                  style={{ height: `${v * 12}%` }}
                />
              )}
            </span>
            <span className="flex flex-1 items-start">
              {v < 0 && (
                <span
                  className="w-full rounded-b-sm bg-[var(--mk-tone-6)]"
                  style={{ height: `${-v * 12}%` }}
                />
              )}
            </span>
          </span>
        ))}
      </div>

      <p className="mt-6 text-[13px] font-medium text-[var(--mk-ink)]">Topic trackers</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {TOPICS.map((t) => (
          <li
            key={t.label}
            className="rounded-full bg-[var(--mk-violet-tint)] px-3 py-1 text-[12px] text-[var(--mk-link)]"
          >
            {t.label} <span className="font-semibold">{t.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function IntelligenceSection() {
  return (
    <section
      id="intelligence"
      aria-labelledby="intelligence-title"
      className="scroll-mt-4 bg-[var(--mk-surface)] py-14 sm:py-20"
    >
      <Container className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <AccentHeading
            id="intelligence-title"
            text={"Drive Insights With\n*Conversation Intelligence*"}
            className="text-[28px] sm:text-[38px]"
          />
          <p className="mt-4 max-w-[480px] text-[15px] leading-relaxed text-[var(--mk-body)]">
            Detailed analytics that uncover what works across every conversation, for every team.
          </p>
          <ButtonLink href={ROUTES.signup} arrow className="mt-8">
            Get Started
          </ButtonLink>
          <div className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {INTELLIGENCE_POINTS.map((f) => (
              <FeatureItem key={f.title} feature={f} />
            ))}
          </div>
        </Reveal>
        <Reveal delay={100}>
          <AnalyticsMock />
        </Reveal>
      </Container>
    </section>
  );
}
