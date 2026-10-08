"use client";

import * as Radix from "@radix-ui/react-popover";
import type { ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import { usePortalContainer } from "./theme-root";

import { floatingSurface } from "./menu";

export type PopoverProps = {
  trigger: ReactElement;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  /** Accessible name for the panel. */
  label?: string;
  className?: string;
};

export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  align = "start",
  side = "bottom",
  label,
  className,
}: PopoverProps) {
  const container = usePortalContainer();
  return (
    <Radix.Root open={open} onOpenChange={onOpenChange}>
      <Radix.Trigger asChild>{trigger}</Radix.Trigger>
      <Radix.Portal container={container}>
        <Radix.Content
          align={align}
          side={side}
          sideOffset={6}
          aria-label={label}
          className={cn(floatingSurface, "w-72 p-3 text-body text-primary", className)}
        >
          {children}
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  );
}

export const PopoverClose = Radix.Close;
