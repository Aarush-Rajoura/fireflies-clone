"use client";

import { useQuery } from "@tanstack/react-query";

import { qk, type MeetingListParams } from "@/lib/api";

import { fetchMeetingList } from "../api";

export const RECENT_LIMIT = 5;

const RECENT: MeetingListParams = {
  status: "completed",
  sort: "-started_at",
  page_size: RECENT_LIMIT,
};
const UPCOMING: MeetingListParams = { status: "upcoming", sort: "started_at", page_size: 20 };

/*
 * Keys live under qk.meetings.list, so any meeting mutation elsewhere (create,
 * delete, edit) refreshes Home without extra wiring.
 */
export function useRecentMeetings() {
  return useQuery({
    queryKey: qk.meetings.list(RECENT),
    queryFn: ({ signal }) => fetchMeetingList(RECENT, signal),
  });
}

export function useUpcomingMeetings() {
  return useQuery({
    queryKey: qk.meetings.list(UPCOMING),
    queryFn: ({ signal }) => fetchMeetingList(UPCOMING, signal),
  });
}
