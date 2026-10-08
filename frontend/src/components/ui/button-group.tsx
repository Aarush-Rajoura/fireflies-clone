"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type ButtonGroupItem = {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
  /** Toggle state; omit for plain actions. */
  pressed?: boolean;
  disabled?: boolean;
};

export type ButtonGroupProps = {
  items: readonly ButtonGroupItem[];
  /** Accessible name of the group, e.g. "Meeting ownership". */
  label: string;
  size?: "sm" | "md";
  className?: string;
};

/**
 * Joined outline buttons on the page background with shared borders, as in the
 * Meetings toolbar "Hosted by me | Shared with me". Each segment is its own
 * toggle (aria-pressed), unlike SegmentedControl where exactly one is selected.
 */
export function ButtonGroup({ items, label, size = "md", className }: ButtonGroupProps) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex items-stretch", className)}>
      {items.map((item, i) => (
        <button
          key={item.key}
          type="button"
          onClick={item.onClick}
          disabled={item.disabled}
          aria-pressed={item.pressed}
          className={cn(
            // -ml-px collapses neighbouring borders into one shared line; the
            // focused/pressed segment is raised so its full border shows.
            "relative inline-flex items-center gap-1.5 whitespace-nowrap border border-subtle bg-transparent px-3.5 text-body text-secondary transition-colors duration-fast hover:bg-surface-hover hover:text-primary focus-visible:z-10 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
            size === "sm" ? "h-btn-sm" : "h-btn-md",
            i > 0 && "-ml-px",
            i === 0 && "rounded-l-control",
            i === items.length - 1 && "rounded-r-control",
            item.pressed && "z-[1] bg-surface-3 text-primary",
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
