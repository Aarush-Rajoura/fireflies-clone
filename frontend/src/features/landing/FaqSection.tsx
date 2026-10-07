"use client";

import { useState } from "react";
import { FAQ } from "./content";
import { Icon } from "./icons";
import { Reveal } from "./Reveal";
import { AccentHeading, Container } from "./ui";

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="scroll-mt-4 bg-[var(--mk-white)] py-14 sm:py-20"
    >
      <Container className="max-w-[860px]">
        <Reveal>
          <AccentHeading
            id="faq-title"
            text="Frequently Asked *Questions*"
            className="text-center text-[28px] sm:text-[38px]"
          />
        </Reveal>
        <ul className="mt-10 divide-y divide-[var(--mk-line)] border-y border-[var(--mk-line)]">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <li key={item.q}>
                <h3>
                  <button
                    type="button"
                    id={`faq-q-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-a-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-6 py-4 text-left text-[16px] font-medium text-[var(--mk-ink)] hover:text-[var(--mk-violet)]"
                  >
                    {item.q}
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--mk-line)] transition-transform ${
                        isOpen ? "rotate-45 bg-[var(--mk-violet-tint)]" : ""
                      }`}
                    >
                      <Icon name="plus" size={16} />
                    </span>
                  </button>
                </h3>
                <div
                  id={`faq-a-${i}`}
                  role="region"
                  aria-labelledby={`faq-q-${i}`}
                  hidden={!isOpen}
                >
                  <p className="pb-5 pr-12 text-[15px] leading-relaxed text-[var(--mk-body)]">
                    {item.a}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
