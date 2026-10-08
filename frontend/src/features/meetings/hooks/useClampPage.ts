"use client";

import { useEffect } from "react";

import type { Page } from "@/lib/api";

import type { UpdateMode } from "./useMeetingsParams";

/**
 * A page past the end (a stale `?page=9` link, or deleting the last row of the
 * last page) comes back empty while `total` is still positive. Step back to
 * the last real page, replacing history so Back doesn't return to the void.
 */
export function useClampPage(
  page: Page<unknown> | undefined,
  isPlaceholder: boolean,
  setPage: (page: number, mode: UpdateMode) => void,
) {
  const outOfRange =
    page !== undefined &&
    !isPlaceholder &&
    page.items.length === 0 &&
    page.total > 0 &&
    page.page > page.total_pages;
  const lastPage = Math.max(1, page?.total_pages ?? 1);

  useEffect(() => {
    if (outOfRange) setPage(lastPage, "replace");
  }, [outOfRange, lastPage, setPage]);
}
