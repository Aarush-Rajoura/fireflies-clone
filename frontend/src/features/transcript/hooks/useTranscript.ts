"use client";

import { useQuery } from "@tanstack/react-query";

import { ApiError, qk, type Transcript } from "@/lib/api";

import { getTranscript } from "../api";

/** Active-line lookup is a binary search over `start_ms`, so order is guaranteed here. */
function sortedByStart(t: Transcript): Transcript {
  const sorted = t.segments.every((s, i, all) => i === 0 || all[i - 1]!.start_ms <= s.start_ms);
  if (sorted) return t;
  return {
    ...t,
    segments: [...t.segments].sort((a, b) => a.start_ms - b.start_ms || a.sequence - b.sequence),
  };
}

export function useTranscript(meetingId: number) {
  return useQuery({
    queryKey: qk.transcript(meetingId),
    queryFn: ({ signal }) => getTranscript(meetingId, signal),
    select: sortedByStart,
  });
}

/** 410: the meeting was soft-deleted. The page owns that state (restore banner), not the panel. */
export function isTranscriptGone(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 410;
}

/** 404 or 410: there is no meeting to show a transcript for; the page decides what to render. */
export function isTranscriptUnavailable(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 404 || error.status === 410);
}
