"use client";

import Link from "next/link";
import type { KeyboardEvent } from "react";
import { INTEGRATIONS, type MegaMenuData } from "./content";
import { Icon } from "./icons";
import { BrandMark, PlaceholderMark } from "./marks";

interface MegaMenuProps {
  menu: MegaMenuData;
  panelId: string;
  labelledBy: string;
  /** Registers each focusable item (links, then the card CTA) for arrow-key navigation. */
  registerItem: (index: number, el: HTMLAnchorElement | null) => void;
  onItemKeyDown: (e: KeyboardEvent<HTMLAnchorElement>) => void;
  onNavigate: () => void;
}

/** Number of arrow-key stops in a menu: every column link plus the card CTA. */
export const megaItemCount = (menu: MegaMenuData) => menu.columns.length + 1;

export function MegaMenu({
  menu,
  panelId,
  labelledBy,
  registerItem,
  onItemKeyDown,
  onNavigate,
}: MegaMenuProps) {
  const ctaIndex = menu.columns.length;
  return (
    // Top padding bridges the gap under the trigger so hover does not drop while moving down.
    <div
      id={panelId}
      role="region"
      aria-labelledby={labelledBy}
      className="absolute inset-x-4 top-full pt-1 sm:inset-x-6 lg:inset-x-8"
    >
      <div className="mk-pop grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-10 rounded-2xl bg-[var(--mk-white)] p-10 shadow-[0_30px_80px_var(--mk-shadow-strong)]">
        <ul className="grid grid-cols-2 content-start gap-x-10 gap-y-7">
          {menu.columns.map((link, i) => (
            <li key={link.title}>
              <Link
                href={link.href}
                ref={(el) => registerItem(i, el)}
                onKeyDown={onItemKeyDown}
                onClick={onNavigate}
                className="group block rounded-lg p-2 -m-2 hover:bg-[var(--mk-surface)]"
              >
                <span className="block text-[17px] text-[var(--mk-ink)] group-hover:text-[var(--mk-violet)]">
                  {link.title}
                </span>
                <span className="mt-1.5 block text-[15px] leading-relaxed text-[var(--mk-muted)]">
                  {link.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div>
          {menu.card.visual === "tiles" ? <TilesVisual /> : <GlowVisual />}
          <p className="mt-6 text-[17px] text-[var(--mk-ink)]">{menu.card.title}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--mk-muted)]">
            {menu.card.body}
          </p>
          <Link
            href={menu.card.href}
            ref={(el) => registerItem(ctaIndex, el)}
            onKeyDown={onItemKeyDown}
            onClick={onNavigate}
            className="mt-3 inline-flex items-center gap-1.5 text-[15px] font-medium text-[var(--mk-violet)] hover:underline"
          >
            {menu.card.cta}
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function TilesVisual() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--mk-line)] p-5">
      <div className="grid grid-cols-5 gap-3">
        {INTEGRATIONS.slice(0, 10).map((it) => (
          <div
            key={it.name}
            title={it.name}
            className="flex aspect-square items-center justify-center rounded-lg border border-[var(--mk-line)] bg-[var(--mk-white)] shadow-[0_2px_6px_var(--mk-shadow)]"
          >
            <PlaceholderMark shape={it.shape} tone={it.tone} size={30} />
          </div>
        ))}
      </div>
      {/* Edge fades suggest an endless, scrolling set of apps. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[var(--mk-white)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--mk-white)] to-transparent" />
    </div>
  );
}

function GlowVisual() {
  return (
    <div className="mk-starfield relative flex h-[188px] items-center justify-center overflow-hidden rounded-xl">
      <span className="mk-pulse flex h-24 w-24 items-center justify-center rounded-full bg-[var(--mk-navy-raised)] ring-2 ring-[var(--mk-violet)]">
        <BrandMark size={40} />
      </span>
      <span className="absolute bottom-4 left-4 rounded-md bg-[var(--mk-white-14)] px-2.5 py-1 text-xs text-[var(--mk-on-dark)]">
        Fireflies AI Notetaker
      </span>
    </div>
  );
}
