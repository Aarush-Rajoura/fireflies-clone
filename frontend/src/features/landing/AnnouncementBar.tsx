"use client";

import Link from "next/link";
import { useState } from "react";
import { ANNOUNCEMENT } from "./content";
import { Icon } from "./icons";

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Announcement"
      className="relative bg-[var(--mk-violet)] px-10 py-2 text-center text-[13px] text-[var(--mk-white)] sm:text-[15px]"
    >
      <span className="mr-2 inline-block rounded bg-[var(--mk-green)] px-1.5 py-px text-[11px] font-semibold tracking-wide text-[var(--mk-navy)] sm:text-xs">
        {ANNOUNCEMENT.badge}
      </span>
      <span>{ANNOUNCEMENT.text}</span>{" "}
      <Link
        href={ANNOUNCEMENT.href}
        className="whitespace-nowrap font-medium underline underline-offset-2"
      >
        {ANNOUNCEMENT.cta}
      </Link>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--mk-white)] opacity-80 hover:opacity-100 sm:right-4"
      >
        <Icon name="x" size={18} />
      </button>
    </div>
  );
}
