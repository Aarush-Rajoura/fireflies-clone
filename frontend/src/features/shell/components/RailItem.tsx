"use client";

import Link from "next/link";

import { toast, Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

import type { NavItem } from "../nav";

const itemBase =
  "relative flex h-10 shrink-0 items-center rounded-panel text-secondary transition-colors duration-fast hover:bg-surface-hover hover:text-primary [&_svg]:size-5 [&_svg]:shrink-0";

export function RailItem({
  item,
  active,
  expanded,
}: {
  item: NavItem;
  active: boolean;
  expanded: boolean;
}) {
  const { icon: Icon, label } = item;
  const className = cn(
    itemBase,
    expanded ? "w-full gap-3 px-3" : "w-10 justify-center",
    active && "bg-surface-3 text-primary",
    item.accent && "[&_svg]:text-accent",
  );
  const content = (
    <>
      <Icon strokeWidth={1.75} aria-hidden />
      {expanded && <span className="truncate text-body">{label}</span>}
      {item.dot && (
        <span
          aria-hidden
          className={cn(
            "absolute size-1.5 rounded-full bg-success",
            expanded ? "left-7 top-2" : "right-2 top-2",
          )}
        />
      )}
    </>
  );

  const control = item.href ? (
    <Link
      href={item.href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={className}
    >
      {content}
    </Link>
  ) : (
    <button
      type="button"
      aria-label={label}
      className={className}
      onClick={() => toast.info(`${label} is coming soon.`)}
    >
      {content}
    </button>
  );
  // With the rail expanded the label is on screen, so a tooltip would only repeat it.
  return expanded ? (
    control
  ) : (
    <Tooltip content={label} side="right">
      {control}
    </Tooltip>
  );
}
