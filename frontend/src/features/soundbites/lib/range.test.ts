import { describe, expect, it } from "vitest";

import { clipRangeError, clipRangeForSegment, formatClipRange } from "./range";

const seg = (id: number, start_ms: number, end_ms: number) => ({ id, start_ms, end_ms });
const segments = [seg(1, 0, 1_200), seg(2, 1_500, 2_400), seg(3, 2_600, 5_000), seg(4, 6_000, 20_000)];

describe("clipRangeForSegment", () => {
  it("uses the line's own span when it is long enough", () => {
    expect(clipRangeForSegment(segments, 4, 60_000)).toEqual({ start_ms: 6_000, end_ms: 20_000 });
  });

  it("extends a short line over the following lines until it reaches 3 s", () => {
    expect(clipRangeForSegment(segments, 1, 60_000)).toEqual({ start_ms: 0, end_ms: 5_000 });
    expect(clipRangeForSegment(segments, 2, 60_000)).toEqual({ start_ms: 1_500, end_ms: 5_000 });
  });

  it("pads the last short line and keeps it inside the recording", () => {
    const tail = [seg(1, 50_000, 51_000)];
    expect(clipRangeForSegment(tail, 1, 60_000)).toEqual({ start_ms: 50_000, end_ms: 53_000 });
    // Too close to the end to pad forward: it moves back instead.
    expect(clipRangeForSegment(tail, 1, 51_500)).toEqual({ start_ms: 48_500, end_ms: 51_500 });
  });

  it("caps a very long line at 3 minutes", () => {
    const long = [seg(1, 0, 400_000)];
    expect(clipRangeForSegment(long, 1, 600_000)).toEqual({ start_ms: 0, end_ms: 180_000 });
  });

  it("returns null for an unknown line", () => {
    expect(clipRangeForSegment(segments, 99, 60_000)).toBeNull();
  });
});

describe("clipRangeError", () => {
  it("accepts 3 s to 3 min inside the recording", () => {
    expect(clipRangeError({ start_ms: 0, end_ms: 3_000 }, 60_000)).toBeNull();
    expect(clipRangeError({ start_ms: 0, end_ms: 180_000 }, 600_000)).toBeNull();
  });

  it("explains each way a range can be refused", () => {
    expect(clipRangeError({ start_ms: 0, end_ms: 2_999 }, 60_000)).toBe(
      "A soundbite must be at least 3 seconds long.",
    );
    expect(clipRangeError({ start_ms: 0, end_ms: 180_001 }, 600_000)).toBe(
      "A soundbite can be at most 3 minutes long.",
    );
    expect(clipRangeError({ start_ms: 58_000, end_ms: 62_000 }, 60_000)).toBe(
      "A soundbite must end within the recording (1:00).",
    );
    expect(clipRangeError({ start_ms: -1_000, end_ms: 4_000 }, 60_000)).toBe(
      "A soundbite can't start before the recording.",
    );
  });
});

describe("formatClipRange", () => {
  it("shows the clock range and length", () => {
    expect(formatClipRange({ start_ms: 12_000, end_ms: 19_000 })).toBe("0:12 – 0:19 · 7s");
    expect(formatClipRange({ start_ms: 0, end_ms: 95_000 })).toBe("0:00 – 1:35 · 1m 35s");
  });
});
