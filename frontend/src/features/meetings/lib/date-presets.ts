export type DatePreset = "any" | "today" | "last-7" | "last-30" | "custom";

export const DATE_PRESETS: readonly { id: DatePreset; label: string }[] = [
  { id: "any", label: "Any time" },
  { id: "today", label: "Today" },
  { id: "last-7", label: "Last 7 days" },
  { id: "last-30", label: "Last 30 days" },
  { id: "custom", label: "Custom range" },
];

function isoDay(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function daysAgo(now: Date, days: number): Date {
  const copy = new Date(now);
  copy.setDate(copy.getDate() - days);
  return copy;
}

export type DateRange = { date_from?: string; date_to?: string };

/**
 * "Last 7 days" is six days back plus today; both ends inclusive.
 *
 * Days are the viewer's local calendar, while the API reads date_from/date_to
 * as UTC days, so a range can be off by one near midnight. Accepted until the
 * API takes a time-zone parameter.
 */
export function presetRange(preset: DatePreset, now: Date = new Date()): DateRange {
  const today = isoDay(now);
  switch (preset) {
    case "today":
      return { date_from: today, date_to: today };
    case "last-7":
      return { date_from: isoDay(daysAgo(now, 6)), date_to: today };
    case "last-30":
      return { date_from: isoDay(daysAgo(now, 29)), date_to: today };
    default:
      return {};
  }
}

/** Recognises the preset a range came from, so a shared URL relights the right option. */
export function recognizePreset(range: DateRange, now: Date = new Date()): DatePreset {
  if (!range.date_from && !range.date_to) return "any";
  for (const id of ["today", "last-7", "last-30"] as const) {
    const r = presetRange(id, now);
    if (r.date_from === range.date_from && r.date_to === range.date_to) return id;
  }
  return "custom";
}
