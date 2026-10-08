"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type UnderlineTab<V extends string> = { value: V; label: ReactNode };

export type UnderlineTabsProps<V extends string> = {
  tabs: readonly UnderlineTab<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Accessible name of the tab list. */
  label: string;
  /** Tab ids become `${idPrefix}-${value}`; the selected tab controls `${idPrefix}-panel`. */
  idPrefix: string;
  className?: string;
};

/**
 * Page-level tabs with an accent underline, as on Integrations
 * ("Discover | Connected"). ARIA tabs with roving focus: arrows move and select.
 */
export function UnderlineTabs<V extends string>({
  tabs,
  value,
  onChange,
  label,
  idPrefix,
  className,
}: UnderlineTabsProps<V>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    const target =
      e.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : e.key === "ArrowLeft"
          ? (index - 1 + tabs.length) % tabs.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : undefined;
    const tab = target === undefined ? undefined : tabs[target];
    if (target === undefined || !tab) return;
    e.preventDefault();
    refs.current[target]?.focus();
    onChange(tab.value);
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("flex items-end justify-center", className)}
    >
      {tabs.map((tab, i) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${idPrefix}-${tab.value}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={selected ? `${idPrefix}-panel` : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "relative h-11 px-5 text-body transition-colors duration-fast",
              "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors after:duration-fast",
              selected
                ? "text-accent after:bg-accent"
                : "text-primary after:bg-transparent hover:text-strong",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
