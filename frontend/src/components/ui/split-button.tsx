"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import { Button, type ButtonSize } from "./button";
import { Menu, type MenuItem } from "./menu";

export type SplitButtonProps = {
  label: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
  items: MenuItem[];
  /** Accessible name for the caret, e.g. "More capture options". */
  menuLabel: string;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
};

/**
 * Primary action plus a caret menu: the top-bar "Capture ▾". The two halves are
 * separate buttons so each has its own focus stop and accessible name.
 */
export function SplitButton({
  label,
  icon,
  onClick,
  items,
  menuLabel,
  size = "md",
  disabled,
  className,
}: SplitButtonProps) {
  return (
    <div role="group" className={cn("inline-flex items-stretch", className)}>
      <Button
        variant="primary"
        size={size}
        onClick={onClick}
        disabled={disabled}
        leadingIcon={icon}
        className="rounded-r-none pr-3"
      >
        {label}
      </Button>
      <span aria-hidden className="w-px bg-accent-hover" />
      <Menu
        items={items}
        align="end"
        trigger={
          <Button
            variant="primary"
            size={size}
            iconOnly
            disabled={disabled}
            aria-label={menuLabel}
            className="rounded-l-none"
          >
            <ChevronDown strokeWidth={1.75} />
          </Button>
        }
      />
    </div>
  );
}
