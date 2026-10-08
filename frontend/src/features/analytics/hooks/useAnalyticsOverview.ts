"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { qk, type AnalyticsRange } from "@/lib/api";

import { getAnalyticsOverview } from "../api";
import { useBrowserTimeZone } from "./useBrowserTimeZone";

/**
 * The overview for `range` in the viewer's own time zone, so "busiest hour"
 * and week boundaries are theirs. Switching ranges keeps the previous numbers
 * on screen (dimmed by the caller) instead of flashing skeletons.
 *
 * Always stale: any meeting edit anywhere can change an aggregate.
 */
export function useAnalyticsOverview(range: AnalyticsRange) {
  const tz = useBrowserTimeZone();
  const params = { range, tz: tz ?? "UTC" };
  const query = useQuery({
    queryKey: qk.analytics(params),
    queryFn: ({ signal }) => getAnalyticsOverview(params, signal),
    // The zone is only known in the browser; waiting avoids a wasted UTC fetch.
    enabled: tz !== null,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
  return {
    ...query,
    // Before the zone resolves nothing is fetching yet, but the view is still loading.
    isLoading: query.isLoading || tz === null,
    tz,
  };
}
