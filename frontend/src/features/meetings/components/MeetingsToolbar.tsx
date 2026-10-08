"use client";

import { ArrowUpDown, Check, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ButtonGroup, IconButton, Menu, SearchInput } from "@/components/ui";
import type { MeetingSort } from "@/lib/api";

import type { MeetingScope, MeetingsParams } from "../lib/params";

import { FiltersPopover, type FilterValues } from "./FiltersPopover";

const SORTS: readonly { value: MeetingSort; label: string }[] = [
  { value: "-started_at", label: "Newest first" },
  { value: "started_at", label: "Oldest first" },
  { value: "title", label: "Title (A–Z)" },
  { value: "-duration_ms", label: "Longest first" },
];

export type MeetingsToolbarProps = {
  params: MeetingsParams;
  activeFilterCount: number;
  onScopeChange: (scope: MeetingScope) => void;
  onFiltersChange: (filters: FilterValues) => void;
  onSearch: (q: string) => void;
  onSortChange: (sort: MeetingSort) => void;
};

/** Ownership toggles · Filters on the left; search (icon that expands) and sort on the right. */
export function MeetingsToolbar({
  params,
  activeFilterCount,
  onScopeChange,
  onFiltersChange,
  onSearch,
  onSortChange,
}: MeetingsToolbarProps) {
  // Each toggle is independent; pressing the active one again returns to "all".
  const toggle = (scope: "hosted" | "shared") =>
    onScopeChange(params.scope === scope ? "all" : scope);

  return (
    <div className="flex h-[88px] shrink-0 items-center gap-3 border-b border-subtle px-4 min-[1400px]:gap-4 min-[1400px]:px-6">
      <ButtonGroup
        label="Meeting ownership"
        items={[
          {
            key: "hosted",
            label: "Hosted by me",
            pressed: params.scope === "hosted",
            onClick: () => toggle("hosted"),
          },
          {
            key: "shared",
            label: "Shared with me",
            pressed: params.scope === "shared",
            onClick: () => toggle("shared"),
          },
        ]}
      />
      <span aria-hidden className="hidden h-6 w-px bg-divider min-[1400px]:block" />
      <FiltersPopover
        value={{
          participant: params.participant,
          date_from: params.date_from,
          date_to: params.date_to,
        }}
        activeCount={activeFilterCount}
        onApply={onFiltersChange}
      />

      <div className="ml-auto flex min-w-0 items-center justify-end gap-2">
        <ExpandingSearch value={params.q ?? ""} onSearch={onSearch} />
        <Menu
          trigger={
            <IconButton
              label="Sort"
              variant="secondary"
              icon={<ArrowUpDown strokeWidth={1.75} />}
            />
          }
          items={[
            { type: "label", label: "Sort by" },
            ...SORTS.map((s) => ({
              label: s.label,
              trailing:
                s.value === params.sort ? (
                  <Check aria-label="Selected" className="size-3.5" />
                ) : undefined,
              onSelect: () => onSortChange(s.value),
            })),
          ]}
        />
      </div>
    </div>
  );
}

/** Starts as an icon; opens into the search box, and folds back when left empty. */
function ExpandingSearch({ value, onSearch }: { value: string; onSearch: (q: string) => void }) {
  const [open, setOpen] = useState(value !== "");
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);
  const input = useRef<HTMLInputElement>(null);
  // Focus only when the user opened it, not when a ?q= link loads it open.
  const focusOnOpen = useRef(false);

  // Back/forward or a cleared filter changes the URL underneath us; follow it
  // (adjusted during render, React's pattern for state derived from a prop).
  if (seen !== value) {
    setSeen(value);
    if (value !== text.trim()) setText(value);
    if (value) setOpen(true);
  }

  useEffect(() => {
    if (open && focusOnOpen.current) input.current?.focus();
    focusOnOpen.current = false;
  }, [open]);

  if (!open) {
    return (
      <IconButton
        label="Search meetings"
        variant="secondary"
        icon={<Search strokeWidth={1.75} />}
        onClick={() => {
          focusOnOpen.current = true;
          setOpen(true);
        }}
      />
    );
  }
  return (
    <div className="w-72 min-w-[120px] shrink">
      <SearchInput
        ref={input}
        label="Search meetings"
        placeholder="Search by title, person or keyword"
        value={text}
        onValueChange={setText}
        onSearch={onSearch}
        debounceMs={300}
        onBlur={() => {
          if (!text) setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !text) {
            e.preventDefault();
            setOpen(false);
          }
        }}
      />
    </div>
  );
}
