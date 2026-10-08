import type { MeetingListParams, MeetingSort } from "@/lib/api";

export type MeetingScope = "all" | "hosted" | "shared" | "uploads";

/** Everything the hub's URL can say. Defaults are omitted from the URL. */
export type MeetingsParams = {
  q?: string;
  participant?: string;
  date_from?: string;
  date_to?: string;
  channel?: number;
  scope: MeetingScope;
  sort: MeetingSort;
  page: number;
};

export const DEFAULT_SORT: MeetingSort = "-started_at";
export const PAGE_SIZE = 20;

const SCOPES: readonly MeetingScope[] = ["all", "hosted", "shared", "uploads"];
const SORTS: readonly MeetingSort[] = ["-started_at", "started_at", "title", "-duration_ms"];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function text(raw: string | null): string | undefined {
  const value = raw?.trim();
  return value ? value : undefined;
}

function positiveInt(raw: string | null): number | undefined {
  if (raw === null || !/^\d+$/.test(raw)) return undefined;
  const n = Number(raw);
  return n >= 1 ? n : undefined;
}

/**
 * Reads the URL defensively: a hand-edited or stale link (`?sort=foo`,
 * `?page=-3`, `?date_from=yesterday`) falls back to defaults instead of a 422.
 */
export function parseMeetingsParams(search: URLSearchParams): MeetingsParams {
  const scope = search.get("scope");
  const sort = search.get("sort");
  const day = (key: string) => {
    const value = search.get(key);
    return value && ISO_DAY.test(value) ? value : undefined;
  };
  return {
    q: text(search.get("q")),
    participant: text(search.get("participant")),
    date_from: day("date_from"),
    date_to: day("date_to"),
    channel: positiveInt(search.get("channel")),
    // Deliberately "all": a bare /meetings lights "All Meetings"; "My Meetings" is the explicit scope=hosted.
    scope: SCOPES.includes(scope as MeetingScope) ? (scope as MeetingScope) : "all",
    sort: SORTS.includes(sort as MeetingSort) ? (sort as MeetingSort) : DEFAULT_SORT,
    page: positiveInt(search.get("page")) ?? 1,
  };
}

/** Stable key order and no defaults, so one view always has one URL. */
export function serializeMeetingsParams(params: MeetingsParams): string {
  const out = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value !== undefined && value !== "") out.set(key, String(value));
  };
  set("channel", params.channel);
  set("date_from", params.date_from);
  set("date_to", params.date_to);
  set("page", params.page > 1 ? params.page : undefined);
  set("participant", params.participant);
  set("q", params.q);
  set("scope", params.scope === "all" ? undefined : params.scope);
  set("sort", params.sort === DEFAULT_SORT ? undefined : params.sort);
  return out.toString();
}

/** The request the URL state stands for. */
export function toListQuery(params: MeetingsParams): MeetingListParams {
  return {
    q: params.q,
    participant: params.participant,
    date_from: params.date_from,
    date_to: params.date_to,
    channel: params.channel,
    scope: params.scope,
    sort: params.sort,
    page: params.page,
    page_size: PAGE_SIZE,
  };
}

/** Filters that narrow the list (the Filters badge); scope/channel/sort/page are views, not filters. */
export function activeFilterCount(params: MeetingsParams): number {
  return [params.participant, params.date_from ?? params.date_to].filter(Boolean).length;
}

/** A search or filter (what "Clear filters" undoes) could explain an empty result. */
export function isNarrowed(params: MeetingsParams): boolean {
  return Boolean(params.q || params.participant || params.date_from || params.date_to);
}
