import type { ActionItem } from "@/lib/api";

/*
 * Rollbacks touch ONE row by id, never restore a whole-list snapshot: with two
 * edits in flight, restoring the first's snapshot would also erase the second.
 */

export function replaceItem(list: ActionItem[] | undefined, item: ActionItem) {
  return list?.map((x) => (x.id === item.id ? item : x));
}

export function removeItem(list: ActionItem[] | undefined, id: number) {
  return list?.filter((x) => x.id !== id);
}

/** Puts a removed row back near where it was, unless a refetch already brought it back. */
export function reinsertItem(list: ActionItem[] | undefined, item: ActionItem, index: number) {
  if (!list || list.some((x) => x.id === item.id)) return list;
  const next = [...list];
  next.splice(Math.min(Math.max(index, 0), next.length), 0, item);
  return next;
}
