"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ROUTES, SUMMARY_TABS, type SummaryTab } from "./content";
import { MockTopBar, MockWindow } from "./mockParts";
import { Reveal } from "./Reveal";
import { nextTabIndex } from "./tabsState";
import { AccentHeading, ButtonLink, Container } from "./ui";

export function SummariesSection() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tab = SUMMARY_TABS[active] ?? SUMMARY_TABS[0];

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const next = nextTabIndex(active, e.key, SUMMARY_TABS.length);
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <section aria-labelledby="summaries-title" className="bg-[var(--mk-navy)] py-20 sm:py-28">
      <Container>
        <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <AccentHeading id="summaries-title" dark text="Comprehensive *AI Summaries*" className="text-[32px] sm:text-[44px]" />
            <p className="mt-4 max-w-[480px] text-[17px] leading-relaxed text-[var(--mk-on-dark-muted)]">
              Detailed notes, action items and summaries in your own format, ready minutes after every meeting.
            </p>
          </div>
          <ButtonLink href={ROUTES.signup} arrow className="self-start">
            Get Started
          </ButtonLink>
        </Reveal>

        <div role="tablist" aria-label="Summary formats" className="mt-12 flex flex-wrap justify-center gap-2">
          {SUMMARY_TABS.map((t, i) => {
            const selected = i === active;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`summary-tab-${t.id}`}
                aria-selected={selected}
                aria-controls="summary-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(i)}
                onKeyDown={onKeyDown}
                className={`rounded-md px-3.5 py-2 text-[14px] font-medium transition-colors ${
                  selected
                    ? "bg-[var(--mk-white)] text-[var(--mk-ink)]"
                    : "bg-[var(--mk-secondary)] text-[var(--mk-on-dark)] hover:bg-[var(--mk-secondary-hover)]"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <Reveal delay={80} className="mt-8">
          <MockWindow className="mx-auto max-w-[1000px]">
            <MockTopBar extra="Soundbite" />
            <div
              id="summary-panel"
              role="tabpanel"
              aria-labelledby={tab ? `summary-tab-${tab.id}` : undefined}
              tabIndex={0}
              className="min-h-[260px] px-5 py-7 sm:px-16 sm:py-10"
            >
              {tab && <SummaryPanel key={tab.id} tab={tab} />}
            </div>
          </MockWindow>
        </Reveal>
      </Container>
    </section>
  );
}

function SummaryPanel({ tab }: { tab: SummaryTab }) {
  if (tab.style === "paragraph") {
    return (
      <div className="mk-pop">
        <p className="text-[15px] font-medium text-[var(--mk-ink)]">{tab.heading}</p>
        {tab.items.map((item) => (
          <p key={item.text} className="mt-3 max-w-[720px] text-[14.5px] leading-relaxed text-[var(--mk-body)]">
            {item.text}
          </p>
        ))}
      </div>
    );
  }

  // Action items are grouped under the person who owns them.
  return (
    <div className="mk-pop">
      <p className="text-[15px] font-medium text-[var(--mk-ink)]">{tab.heading}</p>
      <ul className="mt-3 space-y-3">
        {tab.items.map((item, i) => {
          const showOwner = item.owner && item.owner !== tab.items[i - 1]?.owner;
          return (
            <li key={item.text}>
              {showOwner && <p className="mb-2 mt-4 text-[13px] text-[var(--mk-muted)]">{item.owner}</p>}
              <p className="flex gap-3 text-[14.5px] leading-relaxed text-[var(--mk-body)]">
                <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--mk-muted)]" />
                <span>
                  {item.text}
                  {item.time && <span className="ml-1.5 text-[var(--mk-link)]">{item.time}</span>}
                </span>
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
