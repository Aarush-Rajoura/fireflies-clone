import { parseDueDate } from "@/features/action-items";
import type { ActionItem } from "@/lib/api";

import type { DueBucket } from "./params";

export type TaskGroupKey = DueBucket | "completed";

export type TaskGroup = { key: TaskGroupKey; label: string; items: ActionItem[] };

export const GROUP_LABELS: Record<TaskGroupKey, string> = {
  overdue: "Overdue",
  today: "Today",
  week: "This week",
  later: "Later",
  none: "No date",
  completed: "Completed",
};

const ORDER: readonly TaskGroupKey[] = ["overdue", "today", "week", "later", "none", "completed"];

// Must match the server's rolling window: today plus the next six days.
const WEEK_DAYS = 7;
const MS_PER_DAY = 86_400_000;

function dayNumber(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_PER_DAY;
}

/** Which bucket a `YYYY-MM-DD` due date falls in, counted in local calendar days. */
export function dueBucket(dueDate: string | null, now: Date = new Date()): DueBucket {
  const due = dueDate ? parseDueDate(dueDate) : null;
  if (!due) return "none";
  const days = dayNumber(due) - dayNumber(now);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days < WEEK_DAYS) return "week";
  return "later";
}

/**
 * Open tasks by due bucket, then one Completed group, so a finished task never
 * sits under "Overdue". Empty groups are dropped; items keep the server order.
 */
export function groupTasks(items: readonly ActionItem[], now: Date = new Date()): TaskGroup[] {
  const byKey = new Map<TaskGroupKey, ActionItem[]>();
  for (const item of items) {
    const key = item.status === "completed" ? "completed" : dueBucket(item.due_date, now);
    byKey.set(key, [...(byKey.get(key) ?? []), item]);
  }
  return ORDER.flatMap((key) => {
    const list = byKey.get(key);
    return list?.length ? [{ key, label: GROUP_LABELS[key], items: list }] : [];
  });
}
