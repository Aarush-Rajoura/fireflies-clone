import { describe, expect, it } from "vitest";

import { findActiveSegmentIndex } from "./active-segment";

// Lines at 1s-3s, 3s-5s, a gap, then 8s-10s.
const segments = [{ start_ms: 1_000 }, { start_ms: 3_000 }, { start_ms: 8_000 }];

describe("findActiveSegmentIndex", () => {
  it("is -1 before the first line and for an empty transcript", () => {
    expect(findActiveSegmentIndex(segments, 0)).toBe(-1);
    expect(findActiveSegmentIndex(segments, 999)).toBe(-1);
    expect(findActiveSegmentIndex([], 5_000)).toBe(-1);
  });

  it("switches exactly on a line's start_ms", () => {
    expect(findActiveSegmentIndex(segments, 1_000)).toBe(0);
    expect(findActiveSegmentIndex(segments, 2_999)).toBe(0);
    expect(findActiveSegmentIndex(segments, 3_000)).toBe(1);
    expect(findActiveSegmentIndex(segments, 8_000)).toBe(2);
  });

  it("keeps the previous line active through a gap", () => {
    expect(findActiveSegmentIndex(segments, 6_500)).toBe(1);
  });

  it("stays on the last line after the end", () => {
    expect(findActiveSegmentIndex(segments, 60_000)).toBe(2);
  });

  it("handles a single line", () => {
    expect(findActiveSegmentIndex([{ start_ms: 500 }], 499)).toBe(-1);
    expect(findActiveSegmentIndex([{ start_ms: 500 }], 500)).toBe(0);
    expect(findActiveSegmentIndex([{ start_ms: 500 }], 9_999)).toBe(0);
  });

  it("agrees with a linear scan on a long transcript", () => {
    const many = Array.from({ length: 151 }, (_, i) => ({ start_ms: i * 1_337 }));
    for (let ms = -10; ms < 151 * 1_337 + 10; ms += 97) {
      const linear = many.reduce((acc, s, i) => (s.start_ms <= ms ? i : acc), -1);
      expect(findActiveSegmentIndex(many, ms)).toBe(linear);
    }
  });
});
