import { describe, expect, it } from "vitest";

import { attachNoteRanges, buildChapters, formatChapterRange, formatChapterTime } from "./chapters";

describe("chapters", () => {
  it("formats zero-padded chapter clocks", () => {
    expect(formatChapterTime(0)).toBe("00:00");
    expect(formatChapterTime(612_999)).toBe("10:12");
    expect(formatChapterTime(3_723_000)).toBe("1:02:03");
  });

  it("ends each chapter where the next starts and the last at the meeting's end", () => {
    const chapters = buildChapters(
      [
        { title: "Intro", start_ms: 0 },
        { title: "Use Case & Requirements", start_ms: 60_000 },
        { title: "Pricing", start_ms: 612_000 },
      ],
      900_000,
    );
    expect(chapters.map(formatChapterRange)).toEqual([
      "00:00 – 01:00",
      "01:00 – 10:12",
      "10:12 – 15:00",
    ]);
  });

  it("skips unanchored and earlier entries when finding a chapter's end", () => {
    const chapters = buildChapters(
      [
        { title: "A", start_ms: 10_000 },
        { title: "B", start_ms: null },
        { title: "C", start_ms: 5_000 },
        { title: "D", start_ms: 30_000 },
      ],
      60_000,
    );
    expect(chapters[0]).toEqual({ title: "A", startMs: 10_000, endMs: 30_000 });
    expect(chapters[1]).toEqual({ title: "B", startMs: null, endMs: null });
    expect(formatChapterRange(chapters[1]!)).toBe("");
  });

  it("shows only the start when the duration is unknown", () => {
    const [only] = buildChapters([{ title: "A", start_ms: 5_000 }], 0);
    expect(formatChapterRange(only!)).toBe("00:05");
  });

  it("matches note groups to chapters by title, then by position", () => {
    const chapters = buildChapters(
      [
        { title: "Intro", start_ms: 0 },
        { title: "Pricing", start_ms: 60_000 },
      ],
      120_000,
    );
    const byTitle = attachNoteRanges(
      [
        { title: "pricing", bullets: ["x"] },
        { title: "Intro", bullets: ["y"] },
      ],
      chapters,
    );
    expect(byTitle.map((n) => n.range?.startMs)).toEqual([60_000, 0]);

    const positional = attachNoteRanges(
      [
        { title: "Opening", bullets: [] },
        { title: "Money", bullets: [] },
      ],
      chapters,
    );
    expect(positional.map((n) => n.range?.title)).toEqual(["Intro", "Pricing"]);
    expect(attachNoteRanges([{ title: "Other", bullets: [] }], chapters)[0]?.range).toBeNull();
  });
});
