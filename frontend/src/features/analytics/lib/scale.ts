/** Pure scale and tick helpers for the hand-drawn charts. */

/** Maps `domain` linearly onto `range`; a zero-width domain maps everything to `range[0]`. */
export function linearScale(
  [d0, d1]: readonly [number, number],
  [r0, r1]: readonly [number, number],
): (value: number) => number {
  const span = d1 - d0;
  return (value) => (span === 0 ? r0 : r0 + ((value - d0) / span) * (r1 - r0));
}

/** The smallest 1/2/5 × 10ⁿ step that is at least `raw`. */
function niceStep(raw: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / magnitude;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * magnitude;
}

/**
 * Evenly spaced round ticks from 0 that cover `max`, at most `count + 1` of
 * them. Steps are whole numbers when `integer` (meeting counts never show 0.5).
 * An all-zero series still gets an axis, [0, 1], so bars sit on a real scale.
 */
export function niceTicks(max: number, count = 4, { integer = true } = {}): number[] {
  const top = Math.max(max, integer ? 1 : Number.EPSILON);
  let step = niceStep(top / Math.max(count, 1));
  if (integer) step = Math.max(1, Math.round(step));
  const ticks: number[] = [];
  for (let t = 0; t < top + step; t += step) {
    ticks.push(Number(t.toPrecision(12)));
    if (t >= top) break;
  }
  return ticks;
}

/**
 * Every how-many-th label to draw so at most `maxLabels` show; always keeps
 * the first. 1 means label every slot.
 */
export function labelStride(slots: number, maxLabels: number): number {
  return Math.max(1, Math.ceil(slots / Math.max(1, maxLabels)));
}

/**
 * Bucket `value` into 0..levels-1 relative to `max`. Zero is always level 0 and
 * any non-zero count is at least level 1, so a single meeting is never invisible.
 */
export function intensityLevel(value: number, max: number, levels = 5): number {
  if (value <= 0 || max <= 0) return 0;
  const top = levels - 1;
  return Math.min(top, Math.max(1, Math.ceil((value / max) * top)));
}

/** `value / max` clamped to 0..1, for bar widths; 0 when there is nothing to compare. */
export function fraction(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  return Math.min(1, value / max);
}
