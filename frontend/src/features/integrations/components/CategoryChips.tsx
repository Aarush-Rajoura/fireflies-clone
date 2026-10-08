"use client";

import { Check, ChevronDown } from "lucide-react";

import { Chip, Menu } from "@/components/ui";
import type { IntegrationCategory, IntegrationCategoryInfo } from "@/lib/api";

import { PRIMARY_CATEGORIES } from "../lib/params";

export type CategoryChipsProps = {
  categories: IntegrationCategoryInfo[];
  value: IntegrationCategory | undefined;
  onChange: (category: IntegrationCategory | undefined) => void;
};

/** "All" plus the headline categories as chips; the long tail lives in the More menu. */
export function CategoryChips({ categories, value, onChange }: CategoryChipsProps) {
  const primary = PRIMARY_CATEGORIES.map((key) => categories.find((c) => c.key === key)).filter(
    (c): c is IntegrationCategoryInfo => c !== undefined,
  );
  const more = categories.filter((c) => !PRIMARY_CATEGORIES.includes(c.key));
  const activeMore = more.find((c) => c.key === value);

  return (
    <div
      role="group"
      aria-label="Filter by category"
      className="flex flex-wrap items-center gap-2.5"
    >
      <Chip selected={value === undefined} onClick={() => onChange(undefined)}>
        All
      </Chip>
      {primary.map((c) => (
        <Chip key={c.key} selected={value === c.key} onClick={() => onChange(c.key)}>
          {c.label}
        </Chip>
      ))}
      {more.length > 0 && (
        <Menu
          align="start"
          trigger={
            <Chip
              selected={activeMore !== undefined}
              aria-haspopup="menu"
              className={activeMore ? undefined : "border-transparent bg-transparent"}
            >
              {activeMore?.label ?? "More"}
              <ChevronDown strokeWidth={1.75} aria-hidden />
            </Chip>
          }
          items={more.map((c) => ({
            label: c.label,
            icon: c.key === value ? <Check strokeWidth={1.75} /> : <span className="size-4" />,
            trailing: String(c.count),
            onSelect: () => onChange(c.key),
          }))}
        />
      )}
    </div>
  );
}
