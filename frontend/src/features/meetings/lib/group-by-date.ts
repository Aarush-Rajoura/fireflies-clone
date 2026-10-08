import { LOCALE } from "./format";

export type DateGroup<T> = {
  /** "Today", "Yesterday", "Mon, Oct 5" (with the year once it isn't this one). */
  label: string;
  /** `YYYY-MM-DD` in the viewer's zone: stable, usable as a React key. */
  key: string;
  items: T[];
};

/*
 * The calendar day in the given zone, NOT `toISOString().slice(0, 10)`: that is
 * the UTC day, so an 8 PM meeting in UTC-5 would sit under tomorrow's heading.
 */
export function dayKey(date: Date, timeZone?: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(date);
}

/** Calendar arithmetic on the key itself, so DST days (23/25 h) can't skip or repeat a day. */
function previousDayKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

export function groupHeading(iso: string, now: Date, timeZone?: string): string {
  const date = new Date(iso);
  const key = dayKey(date, timeZone);
  const today = dayKey(now, timeZone);
  if (key === today) return "Today";
  if (key === previousDayKey(today)) return "Yesterday";
  const sameYear = key.slice(0, 4) === today.slice(0, 4);
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
    timeZone,
  }).format(date);
}

/**
 * Buckets consecutive items by day in arrival order. It never re-sorts: the
 * API already applied the chosen sort, and a title sort honestly yields many
 * small groups.
 */
export function groupByDate<T>(
  items: readonly T[],
  getDate: (item: T) => string,
  now: Date = new Date(),
  timeZone?: string,
): DateGroup<T>[] {
  const groups: DateGroup<T>[] = [];
  let current: DateGroup<T> | undefined;
  for (const item of items) {
    const iso = getDate(item);
    const key = dayKey(new Date(iso), timeZone);
    if (!current || current.key !== key) {
      current = { key, label: groupHeading(iso, now, timeZone), items: [] };
      groups.push(current);
    }
    current.items.push(item);
  }
  return groups;
}
