import type { ActionItem } from "@/lib/api";

export type ActionItemGroup = {
  /** Participant id, or null for the Unassigned group. */
  assigneeId: number | null;
  name: string;
  items: ActionItem[];
};

export const UNASSIGNED = "Unassigned";

/**
 * One group per assignee, in the order people first appear (the AI lists
 * items in meeting order), with Unassigned always last. Items keep their order.
 */
export function groupByAssignee(items: readonly ActionItem[]): ActionItemGroup[] {
  const groups = new Map<number, ActionItemGroup>();
  const unassigned: ActionItem[] = [];
  for (const item of items) {
    const a = item.assignee;
    if (!a) {
      unassigned.push(item);
      continue;
    }
    const group = groups.get(a.id) ?? { assigneeId: a.id, name: a.display_name, items: [] };
    group.items.push(item);
    groups.set(a.id, group);
  }
  const result = [...groups.values()];
  if (unassigned.length) result.push({ assigneeId: null, name: UNASSIGNED, items: unassigned });
  return result;
}
