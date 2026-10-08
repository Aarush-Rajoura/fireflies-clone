"use client";

import { CircleHelp } from "lucide-react";

import { Kbd, Popover, Pressable } from "@/components/ui";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Ctrl", "K"], label: "Search meetings" },
  { keys: ["Esc"], label: "Close a menu or dialog" },
  { keys: ["Alt", "H"], label: "Annotate selected transcript text" },
];

/** Floating "?" in the bottom-right corner: help and keyboard shortcuts. */
export function HelpButton() {
  return (
    <Popover
      side="top"
      align="end"
      label="Help and shortcuts"
      trigger={
        <Pressable
          bare
          type="button"
          aria-label="Help and shortcuts"
          className="fixed bottom-6 right-6 z-topbar flex size-12 items-center justify-center rounded-full border-2 border-fab-border bg-fab text-fab-text shadow-popover transition-transform duration-fast hover:scale-105"
        >
          <CircleHelp className="size-6" strokeWidth={1.75} />
        </Pressable>
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
