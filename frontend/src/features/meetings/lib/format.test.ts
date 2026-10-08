import { describe, expect, it } from "vitest";

import { formatDuration, formatMeetingMeta } from "./format";

const MIN = 60_000;

describe("formatDuration", () => {
  it.each([
    [0, "0 min"],
    [-5, "0 min"],
    [Number.NaN, "0 min"],
    [1_000, "1 min"],
    [59_000, "1 min"],
    [MIN, "1 min"],
    [32 * MIN, "32 min"],
    [59 * MIN, "59 min"],
    [60 * MIN - 1_000, "1 h"],
    [60 * MIN, "1 h"],
    [64 * MIN, "1 h 4 min"],
    [2 * 60 * MIN + 30 * MIN, "2 h 30 min"],
  ])("%d ms → %s", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe("formatMeetingMeta", () => {
  it("reads like the reference: date · time · duration · host", () => {
    const meta = formatMeetingMeta(
      { started_at: "2026-10-07T09:00:00Z", duration_ms: 32 * MIN, host: { name: "Ada Lovelace" } },
      "UTC",
    );
    expect(meta).toBe("Oct 7 · 9:00 AM · 32 min · Ada Lovelace");
  });

  it("shows the viewer's local date and time", () => {
    const meta = formatMeetingMeta(
      { started_at: "2026-10-08T02:15:00Z", duration_ms: 64 * MIN, host: { name: "Ada" } },
      "America/New_York",
    );
    expect(meta).toBe("Oct 7 · 10:15 PM · 1 h 4 min · Ada");
  });
});
