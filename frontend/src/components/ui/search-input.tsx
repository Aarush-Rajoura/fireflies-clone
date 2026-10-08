"use client";

import { Search, X } from "lucide-react";
import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import { Input, type InputProps } from "./input";

export type SearchInputProps = Omit<InputProps, "value" | "defaultValue" | "onChange" | "type"> & {
  value?: string;
  defaultValue?: string;
  /** Called after `debounceMs` of no typing, and immediately on clear. */
  onSearch?: (value: string) => void;
  onValueChange?: (value: string) => void;
  debounceMs?: number;
  /** Shown on the right while the field is empty, e.g. a <Kbd> hint. */
  hint?: ReactNode;
  /** Accessible name; the placeholder is not a label. */
  label: string;
};

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { value, defaultValue = "", onSearch, onValueChange, debounceMs = 250, hint, label, className, onKeyDown, ...rest },
  ref,
) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue);
  const current = controlled ? value : inner;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const update = (next: string, immediate = false) => {
    if (!controlled) setInner(next);
    onValueChange?.(next);
    clearTimeout(timer.current);
    if (immediate) onSearch?.(next);
    else timer.current = setTimeout(() => onSearch?.(next), debounceMs);
  };

  return (
    <Input
      ref={ref}
      type="search"
      role="searchbox"
      aria-label={label}
      value={current}
      onChange={(e) => update(e.target.value)}
      onKeyDown={(e) => {
        // Caller first, so it can preventDefault to keep Escape for itself.
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (e.key === "Escape" && current) {
          e.preventDefault();
          update("", true);
        }
      }}
      leadingIcon={<Search strokeWidth={1.75} />}
      trailing={
        current ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => update("", true)}
            className="flex size-6 items-center justify-center rounded-tag text-muted hover:bg-surface-hover hover:text-primary [&_svg]:size-3.5"
          >
            <X strokeWidth={1.75} />
          </button>
        ) : (
          hint
        )
      }
      className={cn("[&::-webkit-search-cancel-button]:hidden", className)}
      {...rest}
    />
  );
});
