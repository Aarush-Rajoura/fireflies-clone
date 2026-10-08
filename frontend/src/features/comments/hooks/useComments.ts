"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { qk, type MeetingComment } from "@/lib/api";

import { fetchComments } from "../api";

export function useComments(meetingId: number) {
  return useQuery({
    queryKey: qk.comments(meetingId),
    queryFn: ({ signal }) => fetchComments(meetingId, signal),
  });
}

const EMPTY: ReadonlyMap<number, number> = new Map();

/** Comments per transcript line (segment id), for the inline badges. Stable until the list changes. */
export function useCommentCounts(meetingId: number): ReadonlyMap<number, number> {
  const { data } = useComments(meetingId);
  return useMemo(() => (data ? countBySegment(data) : EMPTY), [data]);
}

export function countBySegment(comments: readonly MeetingComment[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const c of comments) {
    if (c.segment_id != null) counts.set(c.segment_id, (counts.get(c.segment_id) ?? 0) + 1);
  }
  return counts;
}
