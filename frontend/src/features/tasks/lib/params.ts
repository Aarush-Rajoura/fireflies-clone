import type { TaskListParams } from "@/lib/api";

export type TaskScope = "mine" | "all";
export type TaskStatusFilter = "all" | "open" | "completed";
export type DueBucket = "overdue" | "today" | "week" | "later" | "none";

/** Everything the Tasks URL can say. Defaults are omitted from the URL. */
export type TasksParams = {
  scope: TaskScope;
  status: TaskStatusFilter;
  due?: DueBucket;
  q?: string;
};

export const DEFAULT_PARAMS: TasksParams = { scope: "mine", status: "all" };

const SCOPES: readonly TaskScope[] = ["mine", "all"];
const STATUSES: readonly TaskStatusFilter[] = ["all", "open", "completed"];
export const DUE_BUCKETS: readonly DueBucket[] = ["overdue", "today", "week", "later", "none"];

function oneOf<T extends string>(raw: string | null, allowed: readonly T[]): T | undefined {
  return allowed.includes(raw as T) ? (raw as T) : undefined;
}

/** Reads the URL defensively: a stale or hand-edited link falls back to defaults, never a 422. */
export function parseTasksParams(search: URLSearchParams): TasksParams {
  const q = search.get("q")?.trim();
  return {
    // "My Tasks" first, as in Fireflies.
    scope: oneOf(search.get("scope"), SCOPES) ?? DEFAULT_PARAMS.scope,
    status: oneOf(search.get("status"), STATUSES) ?? DEFAULT_PARAMS.status,
    due: oneOf(search.get("due"), DUE_BUCKETS),
    q: q ? q : undefined,
  };
}

/** Stable key order and no defaults, so one view always has one URL. */
export function serializeTasksParams(params: TasksParams): string {
  const out = new URLSearchParams();
  if (params.due) out.set("due", params.due);
  if (params.q) out.set("q", params.q);
  if (params.scope !== DEFAULT_PARAMS.scope) out.set("scope", params.scope);
  if (params.status !== DEFAULT_PARAMS.status) out.set("status", params.status);
  return out.toString();
}

export function isFiltered(params: TasksParams): boolean {
  return params.status !== "all" || params.due !== undefined || params.q !== undefined;
}

/** The viewer's zone, so "today" on the server is the same day the list groups by. */
export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** The request the URL state stands for (paging is added by the api layer). */
export function toListQuery(params: TasksParams, tz: string = localTimeZone()): TaskListParams {
  return {
    scope: params.scope,
    status: params.status === "all" ? undefined : params.status,
    due: params.due,
    q: params.q,
    tz,
  };
}
