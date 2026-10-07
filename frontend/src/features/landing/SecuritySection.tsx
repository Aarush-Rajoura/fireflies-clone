import { SECURITY_BADGES } from "./content";
import { Icon } from "./icons";
import { Reveal } from "./Reveal";
import { AccentHeading, Container } from "./ui";

export function SecuritySection() {
  return (
    <section
      id="security"
      aria-labelledby="security-title"
      className="scroll-mt-4 bg-[var(--mk-white)] py-14 sm:py-20"
    >
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        <Reveal>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--mk-violet-tint)] px-3 py-1 text-[13px] font-medium text-[var(--mk-link)]">
            <Icon name="shield" size={14} /> Security & privacy
          </span>
          <AccentHeading
            id="security-title"
            text={"Your Meetings,\n*Locked Down*"}
            className="mt-5 text-[28px] sm:text-[38px]"
          />
          <p className="mt-4 max-w-[440px] text-[15px] leading-relaxed text-[var(--mk-body)]">
            Fireflies is built for teams that discuss sensitive things. You control who sees every
            recording, how long it is kept, and where it lives.
          </p>
        </Reveal>
        <ul className="grid gap-4 sm:grid-cols-2">
          {SECURITY_BADGES.map((b, i) => (
            <li key={b.title}>
              <Reveal delay={i * 70} className="h-full">
                <div className="h-full rounded-2xl border border-[var(--mk-line)] bg-[var(--mk-surface)] p-5">
                  <span className="flex text-[var(--mk-violet)]">
                    <Icon name={b.icon} size={22} />
                  </span>
                  <h3 className="mt-3 text-[16px] font-medium text-[var(--mk-ink)]">{b.title}</h3>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-[var(--mk-body)]">
                    {b.body}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
