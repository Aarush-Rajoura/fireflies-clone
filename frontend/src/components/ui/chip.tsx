import { X } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  selected?: boolean;
  icon?: ReactNode;
  /** Renders a trailing remove control instead of making the chip a toggle. */
  onRemove?: () => void;
};

const chipBase =
  "inline-flex h-btn-md shrink-0 items-center gap-1.5 rounded-control border px-3 text-body transition-colors duration-fast [&_svg]:size-4";

/**
 * Outline filter chip, as in the integrations category row: neutral outline,
 * violet outline + tint when selected.
 */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { children, selected = false, icon, onRemove, className, type = "button", ...rest },
  ref,
) {
  const look = selected
    ? "border-accent-border bg-accent-subtle text-accent"
    : "border-subtle bg-surface-2 text-secondary hover:border-strong hover:text-primary";

  if (onRemove) {
    return (
      <span className={cn(chipBase, look, "pr-1", className)}>
        {icon}
        {children}
        <button
          type="button"
          aria-label={`Remove ${typeof children === "string" ? children : "item"}`}
          onClick={onRemove}
          className="flex size-6 items-center justify-center rounded-xs text-muted hover:bg-surface-hover hover:text-primary [&_svg]:size-3.5"
        >
          <X strokeWidth={1.75} />
        </button>
      </span>
    );
  }

  return (
    <button ref={ref} type={type} aria-pressed={selected} className={cn(chipBase, look, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
});
