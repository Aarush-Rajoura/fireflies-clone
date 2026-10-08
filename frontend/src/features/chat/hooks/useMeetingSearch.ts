"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { qk } from "@/lib/api";

import { fetchMeetingContext, searchMeetingsForContext } from "../api";
import type { MeetingContext } from "./useComposer";

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

/** The meeting a saved thread was about, as a composer chip; null while loading or if gone. */
export function useThreadMeeting(id: number | null | undefined): MeetingContext | null {
  const meeting = useQuery({
    queryKey: [...qk.meetings.detail(id ?? 0), "chat-context"],
    queryFn: ({ signal }) => fetchMeetingContext(id ?? 0, signal),
    enabled: id != null,
    retry: false,
  });
  return meeting.data ? { id: meeting.data.id, title: meeting.data.title } : null;
}
