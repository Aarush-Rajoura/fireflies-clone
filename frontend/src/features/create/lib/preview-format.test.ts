import { describe, expect, it } from "vitest";

import { firstLines, formatClock, formatLabel } from "./preview-format";

describe("preview formatting", () => {
  it("formats durations as a clock", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(75_400)).toBe("1:15");
    expect(formatClock(3_725_000)).toBe("1:02:05");
  });

  it("names parser formats for people", () => {
    expect(formatLabel("vtt")).toBe("WebVTT");
    expect(formatLabel("text")).toBe("Plain text");
    expect(formatLabel("xml")).toBe("XML");
  });

  it("keeps only the first five lines", () => {
    const segments = Array.from({ length: 8 }, (_, i) => ({
      speaker: "A",
      start_ms: i,
      end_ms: i + 1,
      text: String(i),
    }));
    expect(firstLines(segments).map((s) => s.text)).toEqual(["0", "1", "2", "3", "4"]);
  });
});
