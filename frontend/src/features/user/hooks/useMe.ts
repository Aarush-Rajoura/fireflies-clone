"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";

import { qk } from "@/lib/api";

import { fetchMe } from "../api";

/** Shared so handlers outside render (e.g. demo sign-in) can `fetchQuery` the same cache entry. */
export const meQuery = queryOptions({
  queryKey: qk.me(),
  queryFn: ({ signal }) => fetchMe(signal),
  // Rarely changes, and the writers (profile, onboarding) put their responses in the cache.
  staleTime: Infinity,
});

/** The signed-in user. */
export function useMe() {
  return useQuery(meQuery);
}
