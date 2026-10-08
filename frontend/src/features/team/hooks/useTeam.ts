"use client";

import { useQuery } from "@tanstack/react-query";

import { qk } from "@/lib/api";

import { fetchMyTeam } from "../api";

/** `data` is null when the user has no team (the create-team empty state). */
export function useMyTeam() {
  return useQuery({
    queryKey: qk.team(),
    queryFn: ({ signal }) => fetchMyTeam(signal),
  });
}
