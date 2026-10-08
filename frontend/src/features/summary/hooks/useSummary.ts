"use client";

import { useQuery } from "@tanstack/react-query";

import { qk } from "@/lib/api";

import { fetchSummary } from "../api";

export function useSummary(meetingId: number) {
  return useQuery({
    queryKey: qk.summary(meetingId),
    queryFn: ({ signal }) => fetchSummary(meetingId, signal),
  });
}
