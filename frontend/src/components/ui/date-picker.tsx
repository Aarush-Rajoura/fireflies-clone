"use client";

import { forwardRef } from "react";

import { cn } from "@/lib/utils/cn";

import { fieldClasses } from "./input";

export type DatePickerProps = {
  /** ISO date, `YYYY-MM-DD`; empty string means no date. */
  value: string;
  onChange: (value: string) => void;
  label: string;
  id?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
};

/*
 * A styled native date input. The browser's picker is keyboard- and
 * screen-reader-accessible for free, and `color-scheme` in tokens.css makes its
 * popup follow the active theme.
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  { value, onChange, label, id, min, max, disabled, className },
  ref,
) {
  return (
    <input
      ref={ref}
      id={id}
      type="date"
      aria-label={label}
      value={value}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(fieldClasses, "tnum h-input w-auto", className)}
    />
  );
});
