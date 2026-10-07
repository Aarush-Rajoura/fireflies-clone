import { INTEGRATIONS, ROUTES } from "./content";
import { Icon } from "./icons";
import { PlaceholderMark } from "./marks";
import { Reveal } from "./Reveal";
import { AccentHeading, Container } from "./ui";
import Link from "next/link";

export function IntegrationsGrid() {
  return (
    <section aria-labelledby="integrations-title" className="bg-[var(--mk-navy)] py-20 sm:py-28">
      <Container>
        <Reveal className="text-center">
          <AccentHeading
            id="integrations-title"
            dark
            text="Works With The *Tools You Already Use*"
            className="text-[32px] sm:text-[44px]"
          />
          <p className="mx-auto mt-4 max-w-[560px] text-[17px] leading-relaxed text-[var(--mk-on-dark-muted)]">
            Send notes, tasks and recordings to 100+ apps automatically, from your CRM to your team chat.
          </p>
        </Reveal>
        <ul className="mx-auto mt-14 grid max-w-[980px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {INTEGRATIONS.map((it, i) => (
            <li key={it.name}>
              <Reveal delay={(i % 4) * 60}>
                <div className="flex items-center gap-3 rounded-xl border border-[var(--mk-line-dark)] bg-[var(--mk-navy-raised)] p-3.5 transition-colors hover:border-[var(--mk-violet)] sm:p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--mk-white)]">
                    <PlaceholderMark shape={it.shape} tone={it.tone} size={24} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium text-[var(--mk-on-dark)]">{it.name}</span>
                    <span className="block text-[13px] text-[var(--mk-on-dark-faint)]">{it.category}</span>
                  </span>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
        <div className="mt-10 text-center">
          <Link
            href={ROUTES.signup}
            className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[var(--mk-violet-soft)] hover:underline"
          >
            Browse all integrations <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      </Container>
    </section>
  );
}
