"use client";

import { useQuery } from "@tanstack/react-query";

import { qk, type MeetingListParams, type Page, type MeetingListItem } from "@/lib/api";

import { fetchMeetings } from "../api";
import { DEFAULT_SORT, isAllMeetingsView, toListQuery, type MeetingsParams } from "../lib/params";

// The backend clamps page_size to 100: the most ids one request can scope a question to.
const SCOPE_LIMIT = 100;

export type ScopedMeetingIds =
  | { status: "all"; meetingIds: undefined }
  | { status: "loading" | "error"; meetingIds: undefined }
  | { status: "ready"; meetingIds: number[] };

/**
 * The meetings a hub-wide question should search: every meeting for plain
 * "All Meetings" (no ids sent), otherwise the ids of every meeting matching
 * the view, not just the page on screen. Never a stand-in while loading: a
 * question must not run against the previous view's or an empty scope.
 */
export function useScopedMeetingIds(params: MeetingsParams): ScopedMeetingIds {
  const all = isAllMeetingsView(params);
  // Sort and page don't change which meetings match, so they are fixed to share the cache.
  const query: MeetingListParams = {
    ...toListQuery(params),
    sort: DEFAULT_SORT,
    page: 1,
    page_size: SCOPE_LIMIT,
  };
  const ids = useQuery({
    queryKey: qk.meetings.list(query),
    queryFn: ({ signal }) => fetchMeetings(query, signal),
    select: (page: Page<MeetingListItem>) => page.items.map((m) => m.id),
    enabled: !all,
  });

  if (all) return { status: "all", meetingIds: undefined };
  if (ids.data) return { status: "ready", meetingIds: ids.data };
  return { status: ids.isError ? "error" : "loading", meetingIds: undefined };
}
