"use client";

import { useQuery } from "@tanstack/react-query";

import { qk } from "@/lib/api";

import { fetchActionItems } from "../api";

export function useActionItems(meetingId: number) {
  return useQuery({
    queryKey: qk.actionItems(meetingId),
    queryFn: ({ signal }) => fetchActionItems(meetingId, signal),
  });
}
