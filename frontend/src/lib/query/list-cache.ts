import type { QueryClient, QueryKey } from "@tanstack/react-query";

/*
 * Helpers for optimistic edits to a cached list of rows with ids. Rollbacks
 * touch ONE row by id, never restore a whole-list snapshot: with two edits in
 * flight, restoring the first's snapshot would also erase the second.
 */

type Row = { id: number };

export function replaceById<T extends Row>(list: T[] | undefined, id: number, row: T) {
  return list?.map((x) => (x.id === id ? row : x));
}

export function updateById<T extends Row>(list: T[] | undefined, id: number, fn: (row: T) => T) {
  return list?.map((x) => (x.id === id ? fn(x) : x));
}

export function removeById<T extends Row>(list: T[] | undefined, id: number) {
  return list?.filter((x) => x.id !== id);
}

/** Puts a removed row back near where it was, unless a refetch already brought it back. */
export function reinsertAt<T extends Row>(list: T[] | undefined, row: T, index: number) {
  if (!list || list.some((x) => x.id === row.id)) return list;
  const next = [...list];
  next.splice(Math.min(Math.max(index, 0), next.length), 0, row);
  return next;
}

let nextTempId = -1;

/** Negative, so a placeholder row can never collide with a server id. */
export function tempId(): number {
  return nextTempId--;
}

/**
 * Refetch only once the LAST optimistic mutation in `scope` settles:
 * refetching while another is in flight would flash its change away. Call it
 * from onSettled, where the settling mutation still counts as one.
 */
export function settleList(client: QueryClient, scope: QueryKey, key: QueryKey) {
  if (client.isMutating({ mutationKey: scope }) > 1) return;
  return client.invalidateQueries({ queryKey: key });
}
