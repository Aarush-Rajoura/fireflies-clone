import type { SegmentIn } from "@/lib/api";

/** 75_000 → "1:15", 3_725_000 → "1:02:05". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

const FORMAT_LABELS: Record<string, string> = {
  vtt: "WebVTT",
  srt: "SRT",
  json: "JSON",
  text: "Plain text",
  txt: "Plain text",
};

export function formatLabel(format: string): string {
  return FORMAT_LABELS[format.toLowerCase()] ?? format.toUpperCase();
}

export const PREVIEW_LINES = 5;

export function firstLines(segments: readonly SegmentIn[], count = PREVIEW_LINES): SegmentIn[] {
  return segments.slice(0, count);
}
