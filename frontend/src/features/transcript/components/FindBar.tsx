"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { forwardRef, type KeyboardEvent } from "react";

import { IconButton, SearchInput } from "@/components/ui";

export type FindBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  total: number;
  /** Index of the current match, -1 when none is chosen yet. */
  current: number;
  onNext: () => void;
  onPrev: () => void;
  /** Esc: clears the search and hands focus back to the transcript. */
  onClose: () => void;
};

/**
 * Find in transcript: "3 of 11", Enter/↓ next, Shift+Enter/↑ previous, Esc
 * closes. The bar only reports intent; the panel decides what a step does.
 */
export const FindBar = forwardRef<HTMLInputElement, FindBarProps>(function FindBar(
  { query, onQueryChange, total, current, onNext, onPrev, onClose },
  ref,
) {
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (e.key === "ArrowUp" || (e.key === "Enter" && e.shiftKey)) onPrev();
      else onNext();
    }
  };

  const hasQuery = query.trim().length > 0;
  const status = !hasQuery
    ? ""
    : total === 0
      ? "No results"
      : current >= 0
        ? `${current + 1} of ${total}`
        : `${total} ${total === 1 ? "result" : "results"}`;

  return (
    <div className="flex items-center gap-1">
      <div className="min-w-0 flex-1">
        <SearchInput
          ref={ref}
          label="Search transcript"
          placeholder="Search"
          value={query}
          onValueChange={onQueryChange}
          onKeyDown={onKeyDown}
          className="h-btn-md"
        />
      </div>
      {hasQuery && (
        <>
          <span
            role="status"
            aria-live="polite"
            className="tnum shrink-0 px-1 text-caption text-muted"
          >
            {status}
          </span>
          <IconButton
            label="Previous match"
            size="sm"
            icon={<ChevronUp strokeWidth={1.75} />}
            onClick={onPrev}
            disabled={total === 0}
          />
          <IconButton
            label="Next match"
            size="sm"
            icon={<ChevronDown strokeWidth={1.75} />}
            onClick={onNext}
            disabled={total === 0}
          />
        </>
      )}
    </div>
  );
});
