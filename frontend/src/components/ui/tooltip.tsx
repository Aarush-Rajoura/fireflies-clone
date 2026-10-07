"use client";

import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export const TooltipProvider = RadixTooltip.Provider;

export type TooltipProps = {
  content: ReactNode;
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
};

export function Tooltip({ content, children, side = "bottom", className }: TooltipProps) {
  return (
    // A local provider keeps the primitive usable without app-level setup.
    <RadixTooltip.Provider delayDuration={300} skipDelayDuration={100}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={6}
            className={cn(
              "z-popover max-w-xs rounded-sm border border-subtle bg-surface-1 px-2 py-1 text-xs text-primary shadow-md",
              className,
            )}
          >
            {content}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
