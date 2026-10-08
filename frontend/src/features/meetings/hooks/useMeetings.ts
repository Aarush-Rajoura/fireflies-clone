"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { qk, type MeetingListParams } from "@/lib/api";

import { fetchMeeting, fetchMeetings } from "../api";

/** Keeps the previous page on screen while the next filter/page loads, so the list doesn't flash. */
export function useMeetings(filters: MeetingListParams = {}) {
  return useQuery({
    queryKey: qk.meetings.list(filters),
    queryFn: ({ signal }) => fetchMeetings(filters, signal),
    placeholderData: keepPreviousData,
  });
}

export function useMeeting(id: number) {
  return useQuery({
    queryKey: qk.meetings.detail(id),
    queryFn: ({ signal }) => fetchMeeting(id, signal),
  });
}
