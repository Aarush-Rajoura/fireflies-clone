import type { BadgeTone } from "@/components/ui";
import type { MeetingDetail, MeetingStatus } from "@/lib/api";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

/** "Mar 15, 2026" and "11:30 AM" in the viewer's zone. */
export function formatMeetingDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  return { date: dateFmt.format(d), time: timeFmt.format(d) };
}

/** "45 min", "1 h 05 min", "< 1 min". */
export function formatDuration(ms: number): string {
  const minutes = Math.round(Math.max(0, ms) / 60_000);
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")} min` : `${h} h`;
}

/** Host first, then everyone else: the order the header reads "Name, +N" from. */
export function attendeeNames(meeting: MeetingDetail): string[] {
  const host = meeting.participants.find((p) => p.role === "host");
  const first = host?.display_name ?? meeting.host.name;
  const rest = meeting.participants
    .filter((p) => p !== host && p.display_name !== first)
    .map((p) => p.display_name);
  return [first, ...rest];
}

/** "Sarah Watts, +3" (or just the name when they were alone). */
export function attendeeLabel(names: readonly string[]): string {
  const [first, ...rest] = names;
  if (!first) return "";
  return rest.length ? `${first}, +${rest.length}` : first;
}

export const STATUS_BADGE: Record<MeetingStatus, { label: string; tone: BadgeTone }> = {
  live: { label: "Live (demo)", tone: "danger" },
  processing: { label: "Processing", tone: "warning" },
  completed: { label: "Ready", tone: "success" },
  scheduled: { label: "Scheduled", tone: "neutral" },
};
