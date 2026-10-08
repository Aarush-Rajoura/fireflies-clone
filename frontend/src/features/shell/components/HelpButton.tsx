"use client";

import { CircleHelp } from "lucide-react";

import { Kbd, Popover } from "@/components/ui";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Ctrl", "K"], label: "Search meetings" },
  { keys: ["Esc"], label: "Close a menu or dialog" },
];

/** Floating "?" in the bottom-right corner: help and keyboard shortcuts. */
export function HelpButton() {
  return (
    <Popover
      side="top"
      align="end"
      label="Help and shortcuts"
      trigger={
        <button
          type="button"
          aria-label="Help and shortcuts"
          className="fixed bottom-6 right-6 z-topbar flex size-12 items-center justify-center rounded-full border-2 border-accent-border bg-surface-3 text-primary shadow-popover transition-colors duration-fast hover:bg-surface-hover"
        >
          <CircleHelp className="size-6" strokeWidth={1.75} />
        </button>
      }
    >
      <p className="mb-2 text-body-strong text-strong">Help &amp; shortcuts</p>
      <ul className="flex flex-col gap-2">
        {SHORTCUTS.map((s) => (
          <li
            key={s.label}
            className="flex items-center justify-between gap-3 text-body text-secondary"
          >
            {s.label}
            <Kbd keys={s.keys} />
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-subtle pt-3 text-meta text-muted">
        More shortcuts arrive with the meeting player.
      </p>
    </Popover>
  );
}
