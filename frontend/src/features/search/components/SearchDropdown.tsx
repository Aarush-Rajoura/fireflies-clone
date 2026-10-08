"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { Kbd, SearchInput, Spinner, floatingSurface } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

import { useSearch } from "../hooks/useSearch";
import { useSearchShortcut } from "../hooks/useSearchShortcut";
import { groupByMeeting, hitHref, searchHref } from "../lib/group";
import { HitSnippet } from "./HitSnippet";

export const DROPDOWN_LIMIT = 5;

/** Next option index for ↑/↓, wrapping; -1 means "nothing active" (Enter opens all results). */
export function stepIndex(current: number, count: number, delta: 1 | -1): number {
  if (count === 0) return -1;
  if (current < 0) return delta === 1 ? 0 : count - 1;
  return (current + delta + count) % count;
}

/**
 * Top-bar search with a live preview: the best transcript hits, grouped by
 * meeting, plus a row to the full results page. Focus stays in the input the
 * whole time (combobox pattern); ↑/↓ move the active option, Enter opens it,
 * Esc closes the panel (a second Esc clears the field).
 */
export function SearchDropdown() {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  useSearchShortcut(inputRef);

  const q = value.trim();
  const search = useSearch(value, { pageSize: DROPDOWN_LIMIT, debounceMs: 200 });
  const groups = groupByMeeting(q ? (search.data?.items ?? []).slice(0, DROPDOWN_LIMIT) : []);
  const hits = groups.flatMap((g) => g.hits);
  const seeAllIndex = hits.length;
  const optionCount = q ? hits.length + 1 : 0;
  const activeIndex = active < optionCount ? active : -1;
  const showPanel = open && q.length > 0;
  const optionId = (i: number) => `${listId}-option-${i}`;

  const go = (href: string) => {
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
    router.push(href);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!q) return;
      e.preventDefault();
      setOpen(true);
      setActive(stepIndex(activeIndex, optionCount, e.key === "ArrowDown" ? 1 : -1));
    } else if (e.key === "Enter" && q) {
      e.preventDefault();
      const hit = showPanel ? hits[activeIndex] : undefined;
      go(hit ? hitHref(hit) : searchHref(q));
    } else if (e.key === "Escape" && showPanel) {
      // Keep the text: the first Esc only dismisses the panel.
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className="relative min-w-0">
      <SearchInput
        ref={inputRef}
        label="Search meetings"
        placeholder="Search by title or keyword"
        value={value}
        onValueChange={(next) => {
          setValue(next);
          setActive(-1);
          setOpen(true);
        }}
        hint={<Kbd keys={["Ctrl", "K"]} />}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showPanel}
        aria-controls={showPanel ? listId : undefined}
        aria-activedescendant={showPanel && activeIndex >= 0 ? optionId(activeIndex) : undefined}
      />
      {showPanel && (
        <div
          id={listId}
          role="listbox"
          aria-label="Search results"
          // Keep focus in the input so clicking an option doesn't blur-close the panel first.
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            floatingSurface,
            "absolute left-1/2 top-full mt-2 max-h-[70vh] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 overflow-y-auto p-1.5",
          )}
        >
          <PanelStatus search={search} empty={hits.length === 0} q={q} />
          {groups.map((group) => (
            <div key={group.meetingId} role="group" aria-label={group.title}>
              <p role="presentation" className="truncate px-2.5 pb-1 pt-2 text-label text-muted">
                {group.title}
              </p>
              {group.hits.map((hit) => {
                const i = hits.indexOf(hit);
                return (
                  <Option
                    key={hit.segment_id}
                    id={optionId(i)}
                    active={i === activeIndex}
                    onSelect={() => go(hitHref(hit))}
                    onHover={() => setActive(i)}
                  >
                    <HitSnippet hit={hit} clamp />
                  </Option>
                );
              })}
            </div>
          ))}
          <div className="mt-1 border-t border-subtle pt-1">
            <Option
              id={optionId(seeAllIndex)}
              active={activeIndex === seeAllIndex}
              onSelect={() => go(searchHref(q))}
              onHover={() => setActive(seeAllIndex)}
            >
              <span className="flex items-center gap-2 text-body-strong text-accent">
                <span className="min-w-0 flex-1 truncate">See all results for “{q}”</span>
                <ArrowRight className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              </span>
            </Option>
          </div>
        </div>
      )}
    </div>
  );
}

function Option({
  id,
  active,
  onSelect,
  onHover,
  children,
}: {
  id: string;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
  children: ReactNode;
}) {
  return (
    // Keyboard selection is handled by the combobox input (aria-activedescendant), so options take no focus.
    <div
      id={id}
      role="option"
      aria-selected={active}
      tabIndex={-1}
      onClick={onSelect}
      onMouseMove={onHover}
      className={cn("cursor-pointer rounded-item px-2.5 py-2", active && "bg-surface-hover")}
    >
      {children}
    </div>
  );
}

function PanelStatus({
  search,
  empty,
  q,
}: {
  search: ReturnType<typeof useSearch>;
  empty: boolean;
  q: string;
}) {
  const pending = search.isSettling || search.isFetching;
  if (search.isError && !pending) {
    return <p className="px-2.5 py-2 text-meta text-muted">Search is unavailable right now.</p>;
  }
  if (!empty) return null;
  if (pending) {
    return (
      <p className="flex items-center gap-2 px-2.5 py-2 text-meta text-muted">
        <Spinner label="Searching" /> Searching…
      </p>
    );
  }
  return <p className="px-2.5 py-2 text-meta text-muted">No transcript matches for “{q}”.</p>;
}
