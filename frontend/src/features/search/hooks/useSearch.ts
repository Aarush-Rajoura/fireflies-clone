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
  });
  // While typing ahead of the debounce, the shown results belong to an older query.
  return { ...query, query: debounced, isSettling: q.trim() !== debounced };
}
