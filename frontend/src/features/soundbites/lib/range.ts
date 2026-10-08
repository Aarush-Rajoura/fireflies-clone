import { formatTimestamp } from "@/components/ui";

/** The server's bounds on a clip's length. */
export const MIN_CLIP_MS = 3_000;
export const MAX_CLIP_MS = 180_000;

export type ClipRange = { start_ms: number; end_ms: number };

type Timed = { id: number; start_ms: number; end_ms: number };

/**
 * The clip for a selection in one line: that line's span, extended over the
 * following lines until it is at least MIN_CLIP_MS long, then fitted inside
 * the recording and under MAX_CLIP_MS. Padded with silence (or moved back
 * near the end) when the lines alone are too short.
 */
export function clipRangeForSegment(
  segments: readonly Timed[],
  segmentId: number,
  durationMs: number,
): ClipRange | null {
  const index = segments.findIndex((s) => s.id === segmentId);
  const first = segments[index];
  if (!first) return null;
  let start = first.start_ms;
  let end = first.end_ms;
  for (let i = index + 1; end - start < MIN_CLIP_MS && i < segments.length; i++) {
    end = Math.max(end, segments[i]?.end_ms ?? end);
  }
  end = Math.max(end, start + MIN_CLIP_MS);
  end = Math.min(end, start + MAX_CLIP_MS, durationMs);
  if (end - start < MIN_CLIP_MS) start = Math.max(0, end - MIN_CLIP_MS);
  return { start_ms: start, end_ms: end };
}

/** Why the server would refuse this range, in the user's terms; null when it is valid. */
export function clipRangeError({ start_ms, end_ms }: ClipRange, durationMs: number): string | null {
  if (start_ms < 0) return "A soundbite can't start before the recording.";
  const length = end_ms - start_ms;
  if (length < MIN_CLIP_MS) return "A soundbite must be at least 3 seconds long.";
  if (length > MAX_CLIP_MS) return "A soundbite can be at most 3 minutes long.";
  if (end_ms > durationMs) {
    return `A soundbite must end within the recording (${formatTimestamp(durationMs)}).`;
  }
  return null;
}

/** "0:12 – 0:19 · 7s" */
export function formatClipRange({ start_ms, end_ms }: ClipRange): string {
  const seconds = Math.round((end_ms - start_ms) / 1000);
  const length = seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
  return `${formatTimestamp(start_ms)} – ${formatTimestamp(end_ms)} · ${length}`;
}
