"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { qk } from "@/lib/api";

import { searchMeetingsForContext } from "../api";

/** Candidates for the @ picker. Under ['meetings'] so meeting edits refresh it. */
export function useMeetingSearch(q: string, enabled: boolean) {
  const query = q.trim();
  return useQuery({
    queryKey: [...qk.meetings.all, "chat-context", query],
    queryFn: ({ signal }) => searchMeetingsForContext(query, signal),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
