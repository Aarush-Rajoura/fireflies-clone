import { describe, expect, it } from "vitest";

import { findMatches, matchesBySegment, stepMatch } from "./find-matches";

const seg = (...texts: string[]) => texts.map((text) => ({ text }));

/** The original text each match covers, so offsets are checked against what gets highlighted. */
function covered(segments: { text: string }[], query: string): string[] {
  return findMatches(segments, query).map((m) => segments[m.segmentIndex]!.text.slice(m.start, m.end));
}

describe("findMatches", () => {
  it("returns nothing for an empty or blank query", () => {
    expect(findMatches(seg("anything"), "")).toEqual([]);
    expect(findMatches(seg("anything"), "   ")).toEqual([]);
  });

  it("is case-insensitive and finds several matches per line, with exact offsets", () => {
    expect(findMatches(seg("Pricing, then pricing again", "no", "PRICING"), "pricing")).toEqual([
      { segmentIndex: 0, start: 0, end: 7 },
      { segmentIndex: 0, start: 14, end: 21 },
      { segmentIndex: 2, start: 0, end: 7 },
    ]);
  });

  it.each([
    ['"', 'She said "ship it" twice'],
    ["*", "a*b and *"],
    ["(", "call (draft) (v2"],
    ["-", "follow-up - next"],
    [":", "Agenda: 10:30"],
    ['"*(-:', 'odd "*(-: token'],
    ["c++", "we use c++ and C++"],
    ["a.*b", "a.*b but not axxb"],
  ])("treats %s literally, never as a pattern", (query, text) => {
    const hits = covered(seg(text), query);
    expect(hits.length).toBeGreaterThan(0);
    for (const hit of hits) expect(hit.toLowerCase()).toBe(query.toLowerCase());
  });

  it("does not let regex metacharacters match other text", () => {
    expect(findMatches(seg("axxb"), "a.*b")).toEqual([]);
    expect(findMatches(seg("abc"), "(")).toEqual([]);
  });

  it("ignores diacritics both ways and maps offsets back to the original", () => {
    expect(covered(seg("Meet at the Café later"), "cafe")).toEqual(["Café"]);
    expect(covered(seg("Meet at the cafe later"), "CAFÉ")).toEqual(["cafe"]);
    // Decomposed input ("e" + combining acute): the mark is part of the highlighted letter.
    expect(covered(seg("café au lait"), "cafe")).toEqual(["café"]);
    // Offsets after an accented letter must not drift.
    expect(covered(seg("Señor José y Jose"), "jose")).toEqual(["José", "Jose"]);
  });

  it("counts non-overlapping matches", () => {
    expect(findMatches(seg("aaaa"), "aa")).toHaveLength(2);
  });
});

describe("matchesBySegment", () => {
  it("groups ranges per line and records the global index of each line's first match", () => {
    const matches = findMatches(seg("x x", "", "x"), "x");
    const grouped = matchesBySegment(matches);
    expect(grouped.get(0)).toEqual({
      ranges: [
        { start: 0, end: 1 },
        { start: 2, end: 3 },
      ],
      offset: 0,
    });
    expect(grouped.get(1)).toBeUndefined();
    expect(grouped.get(2)).toEqual({ ranges: [{ start: 0, end: 1 }], offset: 2 });
  });
});

describe("stepMatch", () => {
  it("wraps both ways and starts from the first/last", () => {
    expect(stepMatch(-1, 3, 1)).toBe(0);
    expect(stepMatch(-1, 3, -1)).toBe(2);
    expect(stepMatch(2, 3, 1)).toBe(0);
    expect(stepMatch(0, 3, -1)).toBe(2);
    expect(stepMatch(0, 0, 1)).toBe(-1);
  });
});
