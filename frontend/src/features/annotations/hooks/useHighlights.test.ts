import { describe, expect, it } from "vitest";

import type { Highlight } from "@/lib/api";

import { toRanges } from "./useHighlights";

const h = (id: number, segment_id: number, start: number, end: number): Highlight => ({
  id,
  meeting_id: 1,
  segment_id,
  start_offset: start,
  end_offset: end,
  color: "yellow",
  created_by: 1,
});

describe("toRanges", () => {
  it("groups by line, oldest first, with placeholders newest of all", () => {
    // The server lists in transcript order; a nested later highlight must paint last.
    const ranges = toRanges([h(9, 101, 0, 20), h(3, 101, 5, 8), h(-1, 101, 2, 4), h(4, 102, 0, 3)]);
    expect(ranges.get(101)?.map((r) => r.id)).toEqual([3, 9, -1]);
    expect(ranges.get(102)).toEqual([{ start: 0, end: 3, tone: "yellow", id: 4 }]);
  });
});
