"use client";

import { useQuery } from "@tanstack/react-query";

import { qk } from "@/lib/api";

import { fetchUsage } from "../api";

/** Free-plan meters shown in the top bar and the profile menu. */
export function useUsage() {
  return useQuery({
    queryKey: qk.usage(),
    queryFn: ({ signal }) => fetchUsage(signal),
    staleTime: 60_000,
  });
}
