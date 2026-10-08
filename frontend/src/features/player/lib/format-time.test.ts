import { describe, expect, it } from "vitest";

import { formatClock, parseTimeParam } from "./format-time";

describe("formatClock", () => {
  it.each([
    [0, "0:00"],
    [5_000, "0:05"],
    [5_999, "0:05"],
    [59_999, "0:59"],
    [60_000, "1:00"],
    [724_000, "12:04"],
    [3_599_000, "59:59"],
    [3_600_000, "1:00:00"],
    [3_723_000, "1:02:03"],
    [-1_000, "0:00"],
    [Number.NaN, "0:00"],
  ])("%d ms -> %s", (ms, text) => {
    expect(formatClock(ms)).toBe(text);
  });
});

describe("parseTimeParam", () => {
  it.each([
    ["754", 754_000],
    ["1.5", 1_500],
    ["12m4s", 724_000],
    ["1h2m3s", 3_723_000],
    ["90s", 90_000],
    ["12:04", 724_000],
    ["1:02:03", 3_723_000],
  ])("%s -> %d", (raw, ms) => {
    expect(parseTimeParam(raw)).toBe(ms);
  });

  it.each([null, undefined, "", "abc", "12:", "-5", "1:2:3:4"])("rejects %s", (raw) => {
    expect(parseTimeParam(raw)).toBeNull();
  });
});
