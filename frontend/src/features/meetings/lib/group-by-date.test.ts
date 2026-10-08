import { describe, expect, it } from "vitest";

import { dayKey, groupByDate, groupHeading } from "./group-by-date";

// Thursday 8 Oct 2026, 03:30 UTC = Wednesday 7 Oct, 23:30 in New York (UTC-4).
const NOW = new Date("2026-10-08T03:30:00Z");
const NY = "America/New_York";

describe("groupHeading", () => {
  it("uses the viewer's calendar day, not the UTC day, around midnight", () => {
    // 23:00 NY on the 7th: today there, even though it is already the 8th in UTC.
    expect(groupHeading("2026-10-08T03:00:00Z", NOW, NY)).toBe("Today");
    // 00:00 NY on the 7th is the first instant of today.
    expect(groupHeading("2026-10-07T04:00:00Z", NOW, NY)).toBe("Today");
    // One second earlier is yesterday.
    expect(groupHeading("2026-10-07T03:59:59Z", NOW, NY)).toBe("Yesterday");
    expect(groupHeading("2026-10-06T04:00:00Z", NOW, NY)).toBe("Yesterday");
    expect(groupHeading("2026-10-06T03:59:59Z", NOW, NY)).toBe("Mon, Oct 5");
  });

  it("reads the same instants differently in UTC", () => {
    expect(groupHeading("2026-10-08T03:00:00Z", NOW, "UTC")).toBe("Today");
    expect(groupHeading("2026-10-07T03:59:59Z", NOW, "UTC")).toBe("Yesterday");
    expect(groupHeading("2026-10-06T23:59:59Z", NOW, "UTC")).toBe("Tue, Oct 6");
  });

  it("adds the year once the meeting is from another year", () => {
    expect(groupHeading("2025-12-31T12:00:00Z", NOW, "UTC")).toBe("Wed, Dec 31, 2025");
  });

  it("handles yesterday across a month boundary and a DST change", () => {
    const now = new Date("2026-11-01T16:00:00Z"); // NY falls back on 1 Nov 2026.
    expect(groupHeading("2026-10-31T15:00:00Z", now, NY)).toBe("Yesterday");
    expect(dayKey(now, NY)).toBe("2026-11-01");
  });
});

describe("groupByDate", () => {
  const at = (iso: string) => ({ started_at: iso });

  it("buckets consecutive items per local day, keeping API order", () => {
    const items = [
      at("2026-10-08T03:00:00Z"),
      at("2026-10-07T14:00:00Z"),
      at("2026-10-07T03:00:00Z"),
      at("2026-10-05T15:00:00Z"),
    ];
    const groups = groupByDate(items, (m) => m.started_at, NOW, NY);
    expect(groups.map((g) => [g.label, g.items.length])).toEqual([
      ["Today", 2],
      ["Yesterday", 1],
      ["Mon, Oct 5", 1],
    ]);
    expect(groups[0]?.key).toBe("2026-10-07");
  });

  it("returns no groups for no items", () => {
    expect(groupByDate([], () => "", NOW)).toEqual([]);
  });
});
