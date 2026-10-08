/*
 * Pure form logic for the Schedule and Capture modals: validation and the
 * request bodies. Kept out of the components so the rules are unit-tested.
 */
import type { MeetingCreate } from "@/lib/api";

export type ScheduleForm = {
  title: string;
  /** `YYYY-MM-DD` from the date input, in the viewer's zone. */
  date: string;
  /** `HH:MM` from the time input, in the viewer's zone. */
  time: string;
  meetingUrl: string;
  autoJoin: boolean;
};

export type CaptureForm = { title: string; meetingUrl: string; language: string };

export type FormErrors<F> = Partial<Record<keyof F, string>>;

const URL_PATTERN = /^https?:\/\/[^\s/]+\S*$/i;

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "hi", label: "Hindi" },
  { value: "pt", label: "Portuguese" },
  { value: "ja", label: "Japanese" },
] as const;

function checkUrl(value: string, required: boolean): string | undefined {
  const url = value.trim();
  if (!url) return required ? "Paste the meeting link" : undefined;
  return URL_PATTERN.test(url) ? undefined : "Use a full link starting with https://";
}

/** Local date + time inputs as one instant; null when either part is missing or invalid. */
export function toInstant(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const instant = new Date(`${date}T${time}`);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

export function validateSchedule(
  form: ScheduleForm,
  now: Date = new Date(),
): FormErrors<ScheduleForm> {
  const errors: FormErrors<ScheduleForm> = {};
  if (!form.title.trim()) errors.title = "Give the meeting a name";
  const when = toInstant(form.date, form.time);
  if (!when) errors.date = "Pick a date and time";
  else if (when.getTime() <= now.getTime()) errors.date = "Pick a time in the future";
  const url = checkUrl(form.meetingUrl, false);
  if (url) errors.meetingUrl = url;
  return errors;
}

export function validateCapture(form: CaptureForm): FormErrors<CaptureForm> {
  const errors: FormErrors<CaptureForm> = {};
  if (!form.title.trim()) errors.title = "Give the meeting a name";
  const url = checkUrl(form.meetingUrl, true);
  if (url) errors.meetingUrl = url;
  return errors;
}

/** Call only after `validateSchedule` returned no errors. */
export function scheduleBody(form: ScheduleForm): MeetingCreate {
  const when = toInstant(form.date, form.time);
  if (!when) throw new Error("scheduleBody needs a valid date and time");
  const url = form.meetingUrl.trim();
  return {
    title: form.title.trim(),
    status: "scheduled",
    started_at: when.toISOString(),
    meeting_url: url || null,
    auto_join: form.autoJoin,
    language: "en",
    source: "manual",
  };
}

export function captureBody(form: CaptureForm): MeetingCreate {
  return {
    title: form.title.trim(),
    status: "live",
    meeting_url: form.meetingUrl.trim(),
    language: form.language,
    auto_join: false,
    source: "manual",
  };
}

/** Defaults for a new schedule: the next whole hour, at least 30 minutes away. */
export function defaultSchedule(now: Date = new Date()): ScheduleForm {
  const start = new Date(now.getTime() + 30 * 60_000);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    title: "",
    date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    time: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    meetingUrl: "",
    autoJoin: true,
  };
}
