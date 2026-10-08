import { unwrap, type AnalyticsOverview, type AnalyticsParams } from "@/lib/api";
import { api } from "@/lib/api/client";

/** Workspace-wide aggregates for one time window, bucketed in `tz`. */
export function getAnalyticsOverview(
  query: AnalyticsParams,
  signal?: AbortSignal,
): Promise<AnalyticsOverview> {
  return unwrap(api.GET("/api/v1/analytics/overview", { params: { query }, signal }));
}
