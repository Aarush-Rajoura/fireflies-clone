type Timed = { start_ms: number };

/**
 * Index of the segment playing at `ms`: the last one whose `start_ms` is at or
 * before it, or -1 before the first segment. A gap between two segments keeps
 * the earlier one active, so the highlight never flickers off mid-meeting.
 *
 * Binary search, because this runs on every clock publish (~10/s). Segments
 * must be sorted by `start_ms` (useTranscript guarantees it).
 */
export function findActiveSegmentIndex(segments: readonly Timed[], ms: number): number {
  let lo = 0;
  let hi = segments.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if ((segments[mid]?.start_ms ?? Infinity) <= ms) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}
