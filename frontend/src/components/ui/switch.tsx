"use client";

import * as RadixSwitch from "@radix-ui/react-switch";
import { useId } from "react";

import { cn } from "@/lib/utils/cn";

export type SwitchProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  "aria-label"?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export function Switch({ label, id, className, ...rest }: SwitchProps) {
  const autoId = useId();
  const switchId = id ?? autoId;
  const control = (
    <RadixSwitch.Root
      id={switchId}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full bg-surface-selected transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-accent",
        !label && className,
      )}
      {...rest}
    >
      <RadixSwitch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-on-accent shadow-raised transition-transform duration-fast data-[state=checked]:translate-x-[18px]" />
    </RadixSwitch.Root>
  );
  if (!label) return control;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {control}
      <label htmlFor={switchId} className="cursor-pointer text-body text-secondary">
        {label}
      </label>
    </div>
  );
}
