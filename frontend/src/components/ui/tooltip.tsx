"use client";

import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import { usePortalContainer } from "./theme-root";

/** Mount once (AppProviders does) so hovering across tooltips skips the delay. */
export const TooltipProvider = RadixTooltip.Provider;

export type TooltipProps = {
  content: ReactNode;
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
};

export function Tooltip({ content, children, side = "bottom", className }: TooltipProps) {
  const container = usePortalContainer();
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal container={container}>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className={cn(
            "z-popover max-w-xs rounded-item border border-control bg-surface-1 px-2 py-1 text-caption text-primary shadow-popover",
            className,
          )}
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
