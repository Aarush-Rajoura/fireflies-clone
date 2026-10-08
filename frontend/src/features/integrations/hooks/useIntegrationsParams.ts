"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import type { IntegrationCategory } from "@/lib/api";

import {
  parseIntegrationsParams,
  serializeIntegrationsParams,
  toListQuery,
  type IntegrationsParams,
  type IntegrationsTab,
} from "../lib/params";

/**
 * Tab, category and search live in the URL so a link such as
 * `/integrations?category=project-management` opens the right view. Typing
 * replaces the history entry; deliberate choices push one, so Back undoes them.
 */
export function useIntegrationsParams() {
  const router = useRouter();
  const pathname = usePathname() ?? "/integrations";
  const search = useSearchParams();
  const raw = search?.toString() ?? "";

  const params = useMemo(() => parseIntegrationsParams(new URLSearchParams(raw)), [raw]);

  const write = useCallback(
    (next: IntegrationsParams, mode: "push" | "replace") => {
      const query = serializeIntegrationsParams(next);
      const url = query ? `${pathname}?${query}` : pathname;
      if (mode === "replace") router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [pathname, router],
  );

  const setTab = useCallback(
    (tab: IntegrationsTab) => write({ ...params, tab }, "push"),
    [params, write],
  );
  /** Picking a category is a Discover action, so it also brings Discover forward. */
  const setCategory = useCallback(
    (category: IntegrationCategory | undefined) =>
      write({ ...params, tab: "discover", category }, "push"),
    [params, write],
  );
  const setSearch = useCallback(
    (q: string) => write({ ...params, q: q.trim() || undefined }, params.q ? "replace" : "push"),
    [params, write],
  );

  return {
    params,
    query: useMemo(() => toListQuery(params), [params]),
    setTab,
    setCategory,
    setSearch,
  };
}
