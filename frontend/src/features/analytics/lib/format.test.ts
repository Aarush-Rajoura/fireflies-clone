import { describe, expect, it } from "vitest";

import {
  assignSpeakerColors,
  formatDuration,
  formatHour,
  formatPercent,
  formatWeek,
  isAnalyticsRange,
  rangePhrase,
} from "./format";

describe("formatDuration", () => {
  it.each([
    [0, "0m"],
    [45 * 60_000, "45m"],
    [60 * 60_000, "1h"],
    [65 * 60_000, "1h 05m"],
    [12.6 * 3_600_000, "13h"],
  ])("%d ms → %s", (ms, text) => expect(formatDuration(ms)).toBe(text));
});

describe("labels", () => {
  it("formats percents, hours, weeks and ranges", () => {
    expect(formatPercent(0.004)).toBe("<1%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(0.666)).toBe("67%");
    expect(formatHour(0)).toBe("12 AM");
    expect(formatHour(13)).toBe("1 PM");
    expect(formatWeek("2026-09-07")).toBe("Sep 7");
    expect(rangePhrase("30d")).toBe("the last 30 days");
    expect(rangePhrase("all")).toBe("all time");
    expect(isAnalyticsRange("90d")).toBe(true);
    expect(isAnalyticsRange("1y")).toBe(false);
  });
});

describe("assignSpeakerColors", () => {
  it("never gives two people in one chart the same colour", () => {
    const names = Array.from({ length: 8 }, (_, i) => `Person ${i}`);
    expect(new Set(assignSpeakerColors(names)).size).toBe(8);
  });

  it("is stable for the same ranking", () => {
    const names = ["Sarah Chen", "Raj Patel"];
    expect(assignSpeakerColors(names)).toEqual(assignSpeakerColors(names));
  });
});
