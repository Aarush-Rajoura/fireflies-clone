"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  /** Accessible name when no visible <label> points at the trigger. */
  label?: string;
  id?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
};

export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Select…",
  label,
  id,
  size = "md",
  disabled,
  className,
}: SelectProps) {
  return (
    <RadixSelect.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange} disabled={disabled}>
      <RadixSelect.Trigger
        id={id}
        aria-label={label}
        className={cn(
          "inline-flex w-full items-center justify-between gap-2 rounded-control border border-subtle bg-surface-2 px-3 text-body text-primary transition-colors duration-fast hover:border-strong disabled:opacity-50 data-[placeholder]:text-muted",
          size === "sm" ? "h-btn-sm" : "h-input",
          className,
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon className="text-muted">
          <ChevronDown className="size-4" strokeWidth={1.75} />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className="z-popover max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-subtle bg-surface-1 shadow-lg"
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((o) => (
              <RadixSelect.Item
                key={o.value}
                value={o.value}
                disabled={o.disabled}
                className="relative flex h-8 cursor-pointer select-none items-center rounded-sm pl-2 pr-8 text-body text-secondary outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-surface-hover data-[state=checked]:text-primary data-[highlighted]:text-primary data-[disabled]:opacity-50"
              >
                <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="absolute right-2 text-accent">
                  <Check className="size-4" strokeWidth={1.75} />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
