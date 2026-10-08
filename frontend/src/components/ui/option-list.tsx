"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import { floatingSurface } from "./menu";

export type Option = {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
};

export type OptionListProps = {
  /** DOM id of the listbox; options get `${id}-${index}` for `aria-activedescendant`. */
  id: string;
  label: string;
  options: Option[];
  activeIndex: number;
  onActiveChange: (index: number) => void;
  onSelect: (index: number) => void;
  /** Shown instead of options, e.g. "Loading…" or "No matches". */
  status?: ReactNode;
  className?: string;
};

/** Stable id of one option, for the input's `aria-activedescendant`. */
export const optionId = (listId: string, index: number) => `${listId}-${index}`;

/**
 * The popup half of a combobox: the input keeps focus and drives the active
 * option with the arrow keys, so options never take focus themselves (mouse
 * presses are prevented from blurring the input).
 */
export function OptionList({
  id,
  label,
  options,
  activeIndex,
  onActiveChange,
  onSelect,
  status,
  className,
}: OptionListProps) {
  return (
    <div className={cn(floatingSurface, "max-h-72 overflow-y-auto p-1.5", className)}>
      {status && options.length === 0 ? (
        <p role="status" className="px-2.5 py-2 text-meta text-muted">
          {status}
        </p>
      ) : (
        <ul id={id} role="listbox" aria-label={label} className="flex flex-col">
          {options.map((option, index) => (
            <li
              key={option.id}
              id={optionId(id, index)}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => onActiveChange(index)}
              onClick={() => onSelect(index)}
              className={cn(
                "flex cursor-pointer select-none items-start gap-2.5 rounded-item px-2.5 py-2 text-body text-menu [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted",
                index === activeIndex && "bg-surface-hover text-primary",
              )}
            >
              {option.icon}
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{option.label}</span>
                {option.description && (
                  <span className="truncate text-meta text-muted">{option.description}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
