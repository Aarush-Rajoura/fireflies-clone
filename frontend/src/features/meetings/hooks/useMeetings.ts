"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { qk, type MeetingListParams } from "@/lib/api";

import { fetchMeetings } from "../api";

/** Keeps the previous page on screen while the next filter/page loads, so the list doesn't flash. */
export function useMeetings(filters: MeetingListParams = {}) {
  return useQuery({
    queryKey: qk.meetings.list(filters),
    queryFn: ({ signal }) => fetchMeetings(filters, signal),
    placeholderData: keepPreviousData,
  });
}
