"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { HighlightRange } from "@/components/ui";
import { qk, type Highlight } from "@/lib/api";

import { fetchHighlights } from "../api";

export function useHighlights(meetingId: number) {
  return useQuery({
    queryKey: qk.highlights(meetingId),
    queryFn: ({ signal }) => fetchHighlights(meetingId, signal),
  });
}

const EMPTY: ReadonlyMap<number, readonly HighlightRange[]> = new Map();

/** Highlights as Highlighter ranges, keyed by segment id; stable until the list changes. */
export function useHighlightRanges(meetingId: number): ReadonlyMap<number, readonly HighlightRange[]> {
  const { data } = useHighlights(meetingId);
  return useMemo(() => (data ? toRanges(data) : EMPTY), [data]);
}

/** Oldest first within a line, so where highlights overlap the newest one shows on top. */
export function toRanges(highlights: readonly Highlight[]): Map<number, HighlightRange[]> {
  const out = new Map<number, HighlightRange[]>();
  // Placeholders (negative ids) are the newest of all.
  const age = (h: Highlight) => (h.id < 0 ? Number.MAX_SAFE_INTEGER - h.id : h.id);
  for (const h of [...highlights].sort((a, b) => age(a) - age(b))) {
    const list = out.get(h.segment_id) ?? [];
    list.push({ start: h.start_offset, end: h.end_offset, tone: h.color, id: h.id });
    out.set(h.segment_id, list);
  }
  return out;
}
