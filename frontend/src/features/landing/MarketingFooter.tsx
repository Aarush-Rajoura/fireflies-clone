import Link from "next/link";
import { FOOTER_COLUMNS, ROUTES } from "./content";
import { Icon } from "./icons";
import { Wordmark } from "./marks";
import { Container } from "./ui";

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--mk-line-dark)] bg-[var(--mk-navy-deep)] pb-10 pt-16 text-[var(--mk-on-dark-muted)]">
      <Container>
        <div className="grid gap-12 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div>
            <Link href={ROUTES.home} aria-label="fireflies.ai home" className="inline-flex rounded-md">
              <Wordmark />
            </Link>
            <p className="mt-4 max-w-[300px] text-[15px] leading-relaxed">
              The AI assistant that records, transcribes, summarizes and analyzes your meetings.
            </p>
            <div className="mt-6 flex items-center gap-3 text-[13px]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mk-line-dark)] px-3 py-1">
                <Icon name="shield" size={14} /> SOC 2 Type II
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mk-line-dark)] px-3 py-1">
                <Icon name="lock" size={14} /> GDPR
              </span>
            </div>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-[14px] font-semibold uppercase tracking-[0.08em] text-[var(--mk-on-dark)]">{col.title}</h2>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-[15px] hover:text-[var(--mk-white)]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-[var(--mk-line-dark)] pt-6 text-[13px] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Fireflies clone. A demo project, not affiliated with Fireflies.ai.</p>
          <p className="text-[var(--mk-on-dark-faint)]">Company names and marks shown on this site are fictional placeholders.</p>
        </div>
      </Container>
    </footer>
  );
}
