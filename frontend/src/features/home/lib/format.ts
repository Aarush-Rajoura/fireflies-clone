/* Display helpers for Home. A fixed locale keeps the reference's "Thu, Aug 8 2024, 3:52 PM". */

const LOCALE = "en-US";

/** "Thu, Aug 8 2024, 3:52 PM" */
export function formatHomeDate(iso: string, timeZone?: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat(LOCALE, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(d);
  const year = new Intl.DateTimeFormat(LOCALE, { year: "numeric", timeZone }).format(d);
  const time = new Intl.DateTimeFormat(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(d);
  return `${day} ${year}, ${time}`;
}

/** The greeting name: the first word, or the whole handle when it has no spaces ("23/IT/004"). */
export function firstName(name: string | undefined): string {
  const trimmed = name?.trim() ?? "";
  return trimmed.split(/\s+/)[0] ?? "";
}
