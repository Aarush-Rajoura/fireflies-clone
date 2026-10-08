"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import {
  activeFilterCount,
  parseMeetingsParams,
  serializeMeetingsParams,
  toListQuery,
  type MeetingScope,
  type MeetingsParams,
} from "../lib/params";

export type UpdateMode = "push" | "replace";

/**
 * The hub's filters live in the URL, so every view is shareable and Back
 * undoes a deliberate change. Typing replaces (one keystroke must not cost one
 * Back press); discrete choices push. Any change but paging resets to page 1,
 * or a narrower filter could land on an empty page 4.
 */
export function useMeetingsParams() {
  const router = useRouter();
  const pathname = usePathname() ?? "/meetings";
  const search = useSearchParams();
  const raw = search?.toString() ?? "";

  const params = useMemo(() => parseMeetingsParams(new URLSearchParams(raw)), [raw]);

  const write = useCallback(
    (next: MeetingsParams, mode: UpdateMode) => {
      const query = serializeMeetingsParams(next);
      const url = query ? `${pathname}?${query}` : pathname;
      if (mode === "replace") router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [pathname, router],
  );

  const update = useCallback(
    (patch: Partial<Omit<MeetingsParams, "page">>, mode: UpdateMode = "push") =>
      write({ ...params, ...patch, page: 1 }, mode),
    [params, write],
  );

  /*
   * Starting a search is one Back step; refining it while typing replaces that
   * entry, so Back leaves the search instead of replaying each keystroke.
   */
  const setSearch = useCallback(
    (q: string) => update({ q: q.trim() || undefined }, params.q ? "replace" : "push"),
    [params.q, update],
  );
  /** `replace` corrects an out-of-range page without leaving a dead history entry. */
  const setPage = useCallback(
    (page: number, mode: UpdateMode = "push") => write({ ...params, page }, mode),
    [params, write],
  );
  /** A sidebar view: a scope, or a channel (which clears the scope's ownership filter). */
  const selectView = useCallback(
    (view: { scope: MeetingScope } | { channel: number }) =>
      "channel" in view
        ? update({ channel: view.channel, scope: "all" })
        : update({ channel: undefined, scope: view.scope }),
    [update],
  );
  const clearFilters = useCallback(
    () =>
      update({
        q: undefined,
        participant: undefined,
        date_from: undefined,
        date_to: undefined,
      }),
    [update],
  );

  return {
    params,
    query: useMemo(() => toListQuery(params), [params]),
    activeFilterCount: activeFilterCount(params),
    update,
    setSearch,
    setPage,
    selectView,
    clearFilters,
  };
}

export type MeetingsParamsApi = ReturnType<typeof useMeetingsParams>;
