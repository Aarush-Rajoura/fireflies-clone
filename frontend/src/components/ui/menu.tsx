"use client";

import * as Radix from "@radix-ui/react-dropdown-menu";
import type { ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/** Shared surface for every floating panel so menus, popovers and selects match. */
export const floatingSurface =
  "z-popover rounded-md border border-subtle bg-surface-1 shadow-lg data-[state=open]:animate-fade-in";

export type MenuItem =
  | {
      type?: "item";
      label: string;
      icon?: ReactNode;
      onSelect: () => void;
      danger?: boolean;
      disabled?: boolean;
      trailing?: ReactNode;
    }
  | { type: "separator" }
  | { type: "label"; label: string };

export type MenuProps = {
  trigger: ReactElement;
  items: MenuItem[];
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
};

/** Dropdown menu, e.g. the Capture ▾ list: icon + label rows, keyboard via Radix. */
export function Menu({ trigger, items, align = "end", side = "bottom", className }: MenuProps) {
  return (
    <Radix.Root modal={false}>
      <Radix.Trigger asChild>{trigger}</Radix.Trigger>
      <Radix.Portal>
        <Radix.Content
          align={align}
          side={side}
          sideOffset={6}
          className={cn(floatingSurface, "min-w-[220px] p-1.5", className)}
        >
          {items.map((item, i) => {
            if (item.type === "separator") {
              return <Radix.Separator key={i} className="my-1 h-px bg-divider" />;
            }
            if (item.type === "label") {
              return (
                <Radix.Label key={i} className="px-2.5 pb-1 pt-2 text-label text-muted">
                  {item.label}
                </Radix.Label>
              );
            }
            return (
              <Radix.Item
                key={i}
                disabled={item.disabled}
                onSelect={item.onSelect}
                className={cn(
                  "flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-sm px-2.5 text-body text-primary outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-surface-hover data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-muted",
                  item.danger && "text-danger-strong [&_svg]:text-danger-strong",
                )}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.trailing && <span className="text-xs text-muted">{item.trailing}</span>}
              </Radix.Item>
            );
          })}
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  );
}

/** Alias kept because feature code reads more naturally as "Dropdown" in places. */
export const Dropdown = Menu;
