"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type SegmentedOption<V extends string> = { value: V; label: ReactNode; disabled?: boolean };

export type SegmentedControlProps<V extends string> = {
  options: readonly SegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Accessible name of the group, e.g. "Meeting list". */
  label: string;
  size?: "sm" | "md";
  /** Optional id prefix; tab ids become `${idPrefix}-${value}` for aria-labelledby on panels. */
  idPrefix?: string;
  /**
   * Set when the control drives a tab panel with id `${panelIdPrefix}-${value}`.
   * Only the selected tab gets aria-controls: only its panel is rendered.
   */
  panelIdPrefix?: string;
  className?: string;
};

/**
 * The pill tabs from Home ("Recent | Upcoming | AI Feed") and Tasks
 * ("My Tasks | All Tasks"). ARIA tabs with roving focus: arrows move and
 * select, Home/End jump.
 */
export function SegmentedControl<V extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  idPrefix,
  panelIdPrefix,
  className,
}: SegmentedControlProps<V>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const pos = enabled.indexOf(index);
    let target: number | undefined;
    if (e.key === "ArrowRight" || e.key === "ArrowDown")
      target = enabled[(pos + 1) % enabled.length];
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      target = enabled[(pos - 1 + enabled.length) % enabled.length];
    else if (e.key === "Home") target = enabled[0];
    else if (e.key === "End") target = enabled[enabled.length - 1];
    if (target === undefined) return;
    e.preventDefault();
    const option = options[target];
    if (!option) return;
    refs.current[target]?.focus();
    onChange(option.value);
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("inline-flex items-center gap-0.5 rounded-item bg-surface-3 p-1", className)}
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={idPrefix ? `${idPrefix}-${o.value}` : undefined}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelIdPrefix && selected ? `${panelIdPrefix}-${o.value}` : undefined}
            disabled={o.disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-control text-body-strong transition-colors duration-fast disabled:opacity-50",
              size === "sm" ? "h-7 px-2.5" : "h-8 px-3.5",
              selected
                ? "bg-surface-selected text-primary shadow-raised"
                : "text-secondary hover:text-primary",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
