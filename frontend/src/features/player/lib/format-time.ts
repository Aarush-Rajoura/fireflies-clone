/** "0:05", "12:04", "1:02:03". Truncates (a clock never shows a second that hasn't happened yet). */
export function formatClock(ms: number): string {
  const total = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}

/**
 * Parses a `?t=` deep-link value into ms. Accepts plain seconds ("754",
 * "754.5"), unit form ("12m4s", "1h2m3s", "90s") and clock form ("12:04",
 * "1:02:03"), since links get shared in all three shapes. Returns null for
 * anything unparseable so a bad link just starts at 0.
 */
export function parseTimeParam(value: string | null | undefined): number | null {
  const v = value?.trim().toLowerCase();
  if (!v) return null;

  if (/^\d+(\.\d+)?$/.test(v)) return Math.round(Number(v) * 1000);

  const units = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?$/.exec(v);
  if (units && (units[1] || units[2] || units[3])) {
    const [, h = "0", m = "0", s = "0"] = units;
    return Math.round((Number(h) * 3600 + Number(m) * 60 + Number(s)) * 1000);
  }

  if (/^\d+(:\d{1,2}){1,2}$/.test(v)) {
    return v.split(":").reduce((acc, part) => acc * 60 + Number(part), 0) * 1000;
  }
  return null;
}
