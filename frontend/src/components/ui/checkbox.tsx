"use client";

import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/utils/cn";

export type CheckboxProps = {
  checked?: boolean | "indeterminate";
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Visible label; if omitted, pass `aria-label`. */
  label?: string;
  "aria-label"?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export function Checkbox({ label, onCheckedChange, id, className, ...rest }: CheckboxProps) {
  const autoId = useId();
  const boxId = id ?? autoId;
  const box = (
    <RadixCheckbox.Root
      id={boxId}
      onCheckedChange={(c) => onCheckedChange?.(c === true)}
      className={cn(
        "peer flex size-4 shrink-0 items-center justify-center rounded-tag border border-strong bg-surface-2 text-on-accent transition-colors duration-fast hover:border-accent-border disabled:opacity-50 data-[state=checked]:border-accent data-[state=indeterminate]:border-accent data-[state=checked]:bg-accent data-[state=indeterminate]:bg-accent",
        !label && className,
      )}
      {...rest}
    >
      <RadixCheckbox.Indicator>
        {rest.checked === "indeterminate" ? (
          <Minus className="size-3" strokeWidth={2.5} />
        ) : (
          <Check className="size-3" strokeWidth={2.5} />
        )}
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
  if (!label) return box;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {box}
      <label htmlFor={boxId} className="cursor-pointer text-body text-secondary peer-disabled:cursor-not-allowed">
        {label}
      </label>
    </div>
  );
}
