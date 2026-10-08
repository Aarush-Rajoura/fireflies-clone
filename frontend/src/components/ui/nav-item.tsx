import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type NavItemProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  icon?: ReactNode;
  /** Right after the label, e.g. a "NEW" badge. */
  badge?: ReactNode;
  /** Pushed to the far right, e.g. a count. */
  trailing?: ReactNode;
  /** The current view: violet tint and `aria-current="page"`. */
  active?: boolean;
};

/**
 * A 44px sidebar row (icon · label · badge · trailing), as in the Meetings
 * channel list: "# My Meetings" tinted violet when current.
 */
export const NavItem = forwardRef<HTMLButtonElement, NavItemProps>(function NavItem(
  { label, icon, badge, trailing, active = false, className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 w-full min-w-0 items-center gap-3 rounded-item px-3 text-left text-body transition-colors duration-fast [&_svg]:size-4 [&_svg]:shrink-0",
        active
          ? "bg-accent-subtle text-accent"
          : "text-secondary hover:bg-surface-hover hover:text-primary",
        className,
      )}
      {...rest}
    >
      {icon}
      <span className="truncate">{label}</span>
      {badge}
      {trailing !== undefined && (
        <span className="ml-auto flex shrink-0 items-center">{trailing}</span>
      )}
    </button>
  );
});
