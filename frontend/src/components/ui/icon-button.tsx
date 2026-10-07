"use client";

import { forwardRef } from "react";

import { cn } from "@/lib/utils/cn";

import { Button, type ButtonProps } from "./button";
import { Tooltip } from "./tooltip";

export type IconButtonProps = Omit<ButtonProps, "iconOnly" | "children" | "aria-label"> & {
  /** Required: becomes the accessible name and the tooltip text. */
  label: string;
  icon: React.ReactNode;
  /** Hide the tooltip where the label is already visible nearby. */
  tooltip?: boolean;
  active?: boolean;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, tooltip = true, variant = "ghost", active = false, className, ...rest },
  ref,
) {
  const button = (
    <Button
      ref={ref}
      variant={variant}
      iconOnly
      aria-label={label}
      aria-pressed={active || undefined}
      className={cn(active && "bg-surface-3 text-primary", className)}
      {...rest}
    >
      {icon}
    </Button>
  );
  return tooltip ? <Tooltip content={label}>{button}</Tooltip> : button;
});
