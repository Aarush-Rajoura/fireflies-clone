import { SECURITY_BADGES } from "./content";
import { Icon } from "./icons";
import { Reveal } from "./Reveal";
import { AccentHeading, Container } from "./ui";

export function SecuritySection() {
  return (
    <section aria-labelledby="security-title" className="bg-[var(--mk-white)] py-20 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        <Reveal>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--mk-violet-tint)] px-3 py-1 text-[13px] font-medium text-[var(--mk-link)]">
            <Icon name="shield" size={14} /> Security & privacy
          </span>
          <AccentHeading id="security-title" text={"Your Meetings,\n*Locked Down*"} className="mt-5 text-[32px] sm:text-[44px]" />
          <p className="mt-5 max-w-[440px] text-[17px] leading-relaxed text-[var(--mk-body)]">
            Fireflies is built for teams that discuss sensitive things. You control who sees every recording, how long
            it is kept, and where it lives.
          </p>
        </Reveal>
        <ul className="grid gap-4 sm:grid-cols-2">
          {SECURITY_BADGES.map((b, i) => (
            <li key={b.title}>
              <Reveal delay={i * 70} className="h-full">
                <div className="h-full rounded-2xl border border-[var(--mk-line)] bg-[var(--mk-surface)] p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--mk-navy)] text-[var(--mk-violet-soft)]">
                    <Icon name={b.icon} size={22} />
                  </span>
                  <h3 className="mt-4 text-[17px] font-medium text-[var(--mk-ink)]">{b.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--mk-body)]">{b.body}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
