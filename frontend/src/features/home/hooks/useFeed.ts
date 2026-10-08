"use client";

import { useQuery } from "@tanstack/react-query";

import { qk } from "@/lib/api";

import { fetchFeed } from "../api";

/** Derived server-side from stored summaries and tasks; cheap to refetch. */
export function useFeed(enabled = true) {
  return useQuery({
    queryKey: qk.feed(),
    queryFn: ({ signal }) => fetchFeed(signal),
    enabled,
  });
}
