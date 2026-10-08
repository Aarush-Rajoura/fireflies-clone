"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ROUTES, SUMMARY_TABS, type SummaryTab } from "./content";
import { MockTopBar, MockWindow } from "./mockParts";
import { Reveal } from "./Reveal";
import { nextTabIndex } from "./tabsState";
import { AccentHeading, ButtonLink, Container } from "./ui";
import { Pressable } from "@/components/ui";

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
    <section
      id="summaries"
      aria-labelledby="summaries-title"
      className="scroll-mt-4 bg-[var(--mk-navy)] py-16 sm:py-20"
    >
      <Container>
        <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <AccentHeading
              id="summaries-title"
              dark
              text="Comprehensive *AI Summaries*"
              className="text-[30px] sm:text-[38px]"
            />
            <p className="mt-3 max-w-[480px] text-[15px] leading-relaxed text-[var(--mk-on-dark-muted)]">
              Detailed notes, action items and summaries in your own format, ready minutes after
              every meeting.
            </p>
          </div>
          <ButtonLink href={ROUTES.signup} arrow className="self-start">
            Get Started
          </ButtonLink>
        </Reveal>

        <div
          role="tablist"
          aria-label="Summary formats"
          className="mt-10 flex flex-wrap justify-center gap-2"
        >
          {SUMMARY_TABS.map((t, i) => {
            const selected = i === active;
            return (
              <Pressable
                bare
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
              </Pressable>
            );
          })}
        </div>

        <Reveal delay={80} className="mt-8">
          <MockWindow className="mx-auto max-w-[1000px]">
            <MockTopBar extra="Soundbite" />
            {/* Fixed height so switching tabs never shifts the page; the fade hints at more notes. */}
            <div
              id="summary-panel"
              role="tabpanel"
              aria-labelledby={tab ? `summary-tab-${tab.id}` : undefined}
              tabIndex={0}
              className="relative h-[520px] overflow-hidden px-5 py-6 sm:h-[360px] sm:px-12 sm:py-8"
            >
              {tab && <SummaryPanel key={tab.id} tab={tab} />}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[var(--mk-white)] to-transparent"
              />
            </div>
          </MockWindow>
        </Reveal>
      </Container>
    </section>
  );
}

function SummaryPanel({ tab }: { tab: SummaryTab }) {
  return (
    <div className="mk-pop">
      {tab.intro && (
        <>
          <p className="text-[14px] font-medium text-[var(--mk-ink)]">Overview</p>
          <p className="mt-2 max-w-[760px] text-[13.5px] leading-relaxed text-[var(--mk-body)]">
            {tab.intro}
          </p>
        </>
      )}
      <div className={`grid gap-x-12 gap-y-5 lg:grid-cols-2 ${tab.intro ? "mt-5" : ""}`}>
        {tab.groups.map((group) => (
          <div key={group.label}>
            <p className="flex items-center gap-2 text-[13.5px] font-medium text-[var(--mk-ink)]">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-sm bg-[var(--mk-secondary)]"
              />
              {group.label}
              {group.range && (
                <span className="font-normal text-[var(--mk-muted)]">{group.range}</span>
              )}
            </p>
            <ul className="mt-2 space-y-1.5">
              {group.items.map((item) => (
                <li
                  key={item.text}
                  className="flex gap-2.5 pl-1 text-[13px] leading-relaxed text-[var(--mk-body)]"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-[var(--mk-muted)]"
                  />
                  <span>
                    {item.text}
                    {item.time && <span className="ml-1.5 text-[var(--mk-link)]">{item.time}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
