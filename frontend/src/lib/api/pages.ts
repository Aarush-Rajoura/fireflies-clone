import type { Page } from "./types";

/** The server's page-size cap: whole lists are fetched in as few requests as possible. */
export const MAX_PAGE_SIZE = 100;

/** Follows `has_next` until the list is complete, for small collections that are shown whole. */
export async function fetchAllPages<T>(
  fetchPage: (page: number, pageSize: number) => Promise<Page<T>>,
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const res = await fetchPage(page, MAX_PAGE_SIZE);
    items.push(...res.items);
    if (!res.has_next) return items;
  }
}
