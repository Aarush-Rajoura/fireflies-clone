import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "upgrade";
export type ButtonSize = "sm" | "md";

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Square button holding only an icon; callers must supply `aria-label`. */
  iconOnly?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const base =
  "relative inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-control text-body-strong transition-colors duration-fast disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

export const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-pressed",
  secondary:
    "border border-control bg-surface-2 text-secondary hover:border-strong hover:bg-surface-hover hover:text-primary",
  ghost: "text-secondary hover:bg-surface-hover hover:text-primary",
  danger: "bg-danger text-on-accent hover:bg-danger-hover",
  // The green "Upgrade" pill in the top bar and profile menu.
  upgrade: "bg-upgrade text-upgrade-text hover:bg-upgrade-hover",
};

const sizes: Record<ButtonSize, { text: string; icon: string }> = {
  sm: { text: "h-btn-sm px-3", icon: "size-btn-sm" },
  md: { text: "h-btn-md px-4", icon: "size-btn-md" },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    loading = false,
    iconOnly = false,
    leadingIcon,
    trailingIcon,
    className,
    disabled,
    children,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        base,
        buttonVariants[variant],
        iconOnly ? sizes[size].icon : sizes[size].text,
        className,
      )}
      {...rest}
    >
      {/* The label stays in the layout while loading so the button keeps its width. */}
      <span className={cn("inline-flex items-center gap-1.5", loading && "invisible")}>
        {leadingIcon}
        {children}
        {trailingIcon}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </span>
      )}
    </button>
  );
});
