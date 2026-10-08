"use client";

import { Check } from "lucide-react";
import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type RadioCardOption<V extends string> = {
  value: V;
  label: string;
  description?: string;
  icon?: ReactNode;
};

export type RadioCardGroupProps<V extends string> = {
  options: readonly RadioCardOption<V>[];
  value: V | null;
  onChange: (value: V) => void;
  /** Accessible name of the group (usually the question). */
  label: string;
  className?: string;
};

/**
 * Large selectable cards for one-of-N questions. ARIA radiogroup with roving
 * focus: arrows move and select, Home/End jump, Enter on the selected card
 * submits the form; with nothing selected the first card takes the tab stop.
 */
export function RadioCardGroup<V extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: RadioCardGroupProps<V>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const tabStop = selectedIndex >= 0 ? selectedIndex : 0;

  const select = (index: number) => {
    const option = options[index];
    if (!option) return;
    refs.current[index]?.focus();
    onChange(option.value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    // Like a native radio: Enter on the chosen card submits the surrounding form.
    if (e.key === "Enter" && options[index]?.value === value && e.currentTarget.form) {
      e.preventDefault();
      e.currentTarget.form.requestSubmit();
      return;
    }
    const n = options.length;
    const moves: Record<string, number> = {
      ArrowDown: (index + 1) % n,
      ArrowRight: (index + 1) % n,
      ArrowUp: (index - 1 + n) % n,
      ArrowLeft: (index - 1 + n) % n,
      Home: 0,
      End: n - 1,
    };
    const target = moves[e.key];
    if (target === undefined) return;
    e.preventDefault();
    select(target);
  };

  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-3", className)}>
      {options.map((o, i) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={i === tabStop ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "flex w-full items-center gap-3 rounded-card border p-4 text-left transition-colors duration-fast",
              checked
                ? "border-accent-border bg-accent-faint"
                : "border-control bg-surface-2 hover:border-strong hover:bg-surface-hover",
            )}
          >
            {o.icon && (
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-panel [&_svg]:size-5",
                  checked ? "bg-accent-subtle text-accent" : "bg-surface-3 text-secondary",
                )}
              >
                {o.icon}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-body-strong text-primary">{o.label}</span>
              {o.description && <span className="block text-meta text-muted">{o.description}</span>}
            </span>
            <span
              aria-hidden
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border [&_svg]:size-3",
                checked ? "border-accent bg-accent text-on-accent" : "border-control",
              )}
            >
              {checked && <Check strokeWidth={2.5} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
