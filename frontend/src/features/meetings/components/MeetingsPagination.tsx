"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { IconButton } from "@/components/ui";

export type MeetingsPaginationProps = {
  page: number;
  pageSize: number;
  /** Rows actually on this page; the last page is usually short. */
  itemCount: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

/** "Showing 1–20 of 57" with previous/next. */
export function MeetingsPagination({
  page,
  pageSize,
  itemCount,
  total,
  totalPages,
  onPageChange,
}: MeetingsPaginationProps) {
  // Nothing to count on an empty or out-of-range page (the hub is clamping it).
  if (total === 0 || itemCount === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(first + itemCount - 1, total);
  return (
    <nav
      aria-label="Pagination"
      className="flex h-12 shrink-0 items-center justify-between border-t border-subtle px-6"
    >
      <p className="tnum text-meta text-muted" aria-live="polite">
        Showing {first}–{last} of {total}
      </p>
      <div className="flex items-center gap-1">
        <IconButton
          label="Previous page"
          size="sm"
          icon={<ChevronLeft strokeWidth={1.75} />}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        />
        <span className="tnum px-1 text-meta text-secondary">
          {page} / {Math.max(totalPages, 1)}
        </span>
        <IconButton
          label="Next page"
          size="sm"
          icon={<ChevronRight strokeWidth={1.75} />}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        />
      </div>
    </nav>
  );
}
