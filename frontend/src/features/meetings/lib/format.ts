/*
 * Display formatting for meeting rows. A fixed locale keeps the meta line
 * identical to the reference ("Oct 7 · 9:00 AM · 32 min") and tests stable;
 * the time zone defaults to the viewer's, injectable for tests.
 */

export const LOCALE = "en-US";

const MINUTE_MS = 60_000;

/** "32 min", "1 h", "1 h 4 min". Any non-zero duration shows at least "1 min". */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0 min";
  const totalMinutes = Math.max(1, Math.round(ms / MINUTE_MS));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

/** "Oct 7" */
export function formatShortDate(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric", timeZone }).format(
    new Date(iso),
  );
}

/** "9:00 AM" */
export function formatClock(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

export type MeetingMetaInput = { started_at: string; duration_ms: number; host: { name: string } };

/** "Oct 7 · 9:00 AM · 32 min · Ada Lovelace" */
export function formatMeetingMeta(meeting: MeetingMetaInput, timeZone?: string): string {
  return [
    formatShortDate(meeting.started_at, timeZone),
    formatClock(meeting.started_at, timeZone),
    formatDuration(meeting.duration_ms),
    meeting.host.name,
  ].join(" · ");
}
