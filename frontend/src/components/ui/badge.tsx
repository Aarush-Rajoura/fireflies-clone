import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "count";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-3 text-secondary",
  accent: "bg-accent-faint text-accent",
  success: "bg-success-subtle text-success-strong",
  warning: "bg-warning-subtle text-warning-strong",
  danger: "bg-danger-subtle text-danger-strong",
  // The solid green square holding the free-meetings count.
  count: "bg-count text-success-strong",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone };

/** Small non-interactive label: "NEW", "BETA", "REC", a count. */
export function Badge({ tone = "neutral", className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "tnum inline-flex h-5 shrink-0 items-center rounded-tag px-1.5 text-caption font-medium uppercase",
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
