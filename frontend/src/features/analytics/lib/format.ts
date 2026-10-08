import type { AnalyticsRange, MeetingSource } from "@/lib/api";
import { speakerIndex } from "@/lib/utils/identity";

export const RANGE_OPTIONS: readonly { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];

export const DEFAULT_RANGE: AnalyticsRange = "30d";

export function isAnalyticsRange(value: unknown): value is AnalyticsRange {
  return RANGE_OPTIONS.some((o) => o.value === value);
}

/** "the last 30 days" / "all time", for sentences. */
export function rangePhrase(range: AnalyticsRange): string {
  return range === "all" ? "all time" : `the last ${range.slice(0, -1)} days`;
}

/** Compact duration for tiles and legends: "45m", "1h 05m", "12h". */
export function formatDuration(ms: number): string {
  const minutes = Math.round(Math.max(ms, 0) / 60_000);
  if (minutes < 60) return `${minutes}m`;
  // Past ten hours the minutes are noise.
  if (minutes >= 600) return `${Math.round(minutes / 60)}h`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${String(rest).padStart(2, "0")}m`;
}

export function formatPercent(share: number): string {
  const pct = share * 100;
  if (pct > 0 && pct < 1) return "<1%";
  return `${Math.round(pct)}%`;
}

export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/** 0..23 as "9 AM" / "12 PM". */
export function formatHour(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? "AM" : "PM"}`;
}

/** A week's Monday (an ISO date, already local to the request's zone) as "Sep 7". */
export function formatWeek(isoDate: string, withYear = false): string {
  // Parsed as UTC and printed as UTC: the date is already a local calendar day.
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

export const SOURCE_LABELS: Record<MeetingSource, string> = {
  upload: "Uploaded",
  paste: "Pasted transcript",
  manual: "Created manually",
  seed: "Sample data",
  calendar: "Calendar",
  capture: "Live capture",
};

/**
 * One speaker colour (0..7) per named person: their usual hashed colour, so
 * they match the transcript, unless someone ranked above already holds it —
 * then the next free slot, so no two segments in one bar share a colour.
 */
export function assignSpeakerColors(names: readonly string[]): number[] {
  const taken = new Set<number>();
  return names.map((name) => {
    let slot = speakerIndex(name);
    for (let tries = 0; taken.has(slot) && tries < 8; tries++) slot = (slot + 1) % 8;
    taken.add(slot);
    return slot;
  });
}
