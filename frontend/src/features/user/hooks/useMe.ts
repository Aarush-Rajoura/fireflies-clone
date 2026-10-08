"use client";

import { useQuery } from "@tanstack/react-query";

import { qk } from "@/lib/api";

import { fetchMe } from "../api";

/** The signed-in user. Rarely changes, so it is cached for the whole session. */
export function useMe() {
  return useQuery({
    queryKey: qk.me(),
    queryFn: ({ signal }) => fetchMe(signal),
    staleTime: Infinity,
  });
}
