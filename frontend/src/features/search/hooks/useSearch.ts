"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { qk } from "@/lib/api";

import { searchTranscripts } from "../api";
import { useDebouncedValue } from "./useDebouncedValue";

export type UseSearchOptions = {
  page?: number;
  pageSize?: number;
  /** 0 for a query that is already settled, e.g. one read from the URL. */
  debounceMs?: number;
};

/**
 * Debounced transcript search. Blank queries never hit the network, and the
 * previous results stay on screen while the next keystroke's results load.
 *
 * Always stale: hits come from every meeting, so any edit, rename or delete
 * anywhere can change them, and refetching on mount is cheaper than having
 * every mutation in the app invalidate search.
 */
export function useSearch(
  q: string,
  { page = 1, pageSize = 20, debounceMs = 250 }: UseSearchOptions = {},
) {
  const debounced = useDebouncedValue(q.trim(), debounceMs);
  const params = { q: debounced, page, page_size: pageSize };
  const query = useQuery({
    queryKey: qk.search.page(params),
    queryFn: ({ signal }) => searchTranscripts(params, signal),
    enabled: debounced.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
  const isSettling = q.trim() !== debounced;
  return {
    ...query,
    query: debounced,
    isSettling,
    /** The hits on screen belong to an older query (typing ahead of the debounce, or the new page loading). */
    isStale: isSettling || query.isPlaceholderData,
  };
}
