"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Spinner } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

import type { useSearch } from "../hooks/useSearch";

export function Option({
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

export function PanelStatus({
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
  // Older hits may still be listed (dimmed); say we're on it rather than imply they answer q.
  if (pending && (empty || search.isStale)) {
    return (
      <p className="flex items-center gap-2 px-2.5 py-2 text-meta text-muted">
        <Spinner label="Searching" /> Searching…
      </p>
    );
  }
  if (!empty) return null;
  return <p className="px-2.5 py-2 text-meta text-muted">No transcript matches for “{q}”.</p>;
}

/**
 * Mirrors `?q` into the top-bar field on /search, so the query you are
 * looking at is the one in the box (also after Back/Forward). Its own
 * component so only it, not the whole bar, needs a Suspense boundary for
 * useSearchParams on statically rendered pages.
 */
export function SyncQueryFromUrl({ onQuery }: { onQuery: (q: string) => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const q = pathname === "/search" ? (params.get("q") ?? "") : null;
  useEffect(() => {
    if (q !== null) onQuery(q);
  }, [q, onQuery]);
  return null;
}
