"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import {
  isFiltered,
  parseTasksParams,
  serializeTasksParams,
  toListQuery,
  type TasksParams,
} from "../lib/params";

/**
 * The Tasks view lives in the URL so it is shareable and Back undoes a
 * deliberate change. Every choice here is discrete, so each one pushes.
 */
export function useTasksParams() {
  const router = useRouter();
  const pathname = usePathname() ?? "/tasks";
  const search = useSearchParams();
  const raw = search?.toString() ?? "";

  const params = useMemo(() => parseTasksParams(new URLSearchParams(raw)), [raw]);

  const update = useCallback(
    (patch: Partial<TasksParams>) => {
      const query = serializeTasksParams({ ...params, ...patch });
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const clearFilters = useCallback(
    () => update({ status: "all", due: undefined, q: undefined }),
    [update],
  );

  return {
    params,
    query: useMemo(() => toListQuery(params), [params]),
    filtered: isFiltered(params),
    update,
    clearFilters,
  };
}
