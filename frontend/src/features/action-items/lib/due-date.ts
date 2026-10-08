export type DueTone = "overdue" | "today" | "tomorrow" | "upcoming";

export type DueDescription = { tone: DueTone; label: string };

const MS_PER_DAY = 86_400_000;

/**
 * `YYYY-MM-DD` is a calendar DATE with no zone, so it is read as LOCAL
 * midnight: `new Date("2026-10-12")` would be UTC midnight, i.e. the previous
 * evening west of Greenwich, and flip "Due today" to "Overdue".
 */
export function parseDueDate(value: string): Date | null {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Whole calendar days from `a` to `b`; via UTC fields so a 23h/25h DST day still counts as one. */
function daysBetween(a: Date, b: Date): number {
  const from = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const to = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((to - from) / MS_PER_DAY);
}

/** "Overdue", "Due today", "Due tomorrow", "Due Oct 12"; null when there is no (valid) date. */
export function describeDueDate(
  dueDate: string | null,
  now: Date = new Date(),
): DueDescription | null {
  if (!dueDate) return null;
  const due = parseDueDate(dueDate);
  if (!due) return null;
  const days = daysBetween(now, due);
  if (days < 0) return { tone: "overdue", label: "Overdue" };
  if (days === 0) return { tone: "today", label: "Due today" };
  if (days === 1) return { tone: "tomorrow", label: "Due tomorrow" };
  const sameYear = due.getFullYear() === now.getFullYear();
  const date = due.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  return { tone: "upcoming", label: `Due ${date}` };
}
