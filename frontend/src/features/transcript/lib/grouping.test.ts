import { describe, expect, it } from "vitest";

import { formatTimestamp } from "./format-timestamp";
import { speakerTurnStarts } from "./grouping";

describe("speakerTurnStarts", () => {
  it("shows a header only where the speaker changes", () => {
    const ids = [1, 1, 2, 2, 2, 1, 3];
    expect(speakerTurnStarts(ids.map((speaker_id) => ({ speaker_id })))).toEqual([
      true,
      false,
      true,
      false,
      false,
      true,
      true,
    ]);
  });

  it("handles empty and single-line transcripts", () => {
    expect(speakerTurnStarts([])).toEqual([]);
    expect(speakerTurnStarts([{ speaker_id: 4 }])).toEqual([true]);
  });
});

describe("formatTimestamp", () => {
  it("zero-pads minutes like Fireflies and adds hours only when needed", () => {
    expect(formatTimestamp(0)).toBe("00:00");
    expect(formatTimestamp(53_900)).toBe("00:53");
    expect(formatTimestamp(724_000)).toBe("12:04");
    expect(formatTimestamp(3_723_000)).toBe("1:02:03");
    expect(formatTimestamp(-5)).toBe("00:00");
  });
});
