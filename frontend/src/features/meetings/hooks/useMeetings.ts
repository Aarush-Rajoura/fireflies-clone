"use client";

import { useQuery } from "@tanstack/react-query";

import { qk, type MeetingListParams } from "@/lib/api";

import { fetchMeeting, fetchMeetings } from "../api";

export function useMeetings(filters: MeetingListParams = {}) {
  return useQuery({
    queryKey: qk.meetings.list(filters),
    queryFn: ({ signal }) => fetchMeetings(filters, signal),
  });
}

export function useMeeting(id: number) {
  return useQuery({
    queryKey: qk.meetings.detail(id),
    queryFn: ({ signal }) => fetchMeeting(id, signal),
  });
}
