import { describe, expect, it } from "vitest";

import { relativeTime } from "@/lib/utils/relative-time";

import { firstName, formatHomeDate } from "./format";
import { parseHomeTab } from "./tabs";

describe("formatHomeDate", () => {
  it("matches the reference format", () => {
    expect(formatHomeDate("2024-08-08T15:52:00Z", "UTC")).toBe("Thu, Aug 8 2024, 3:52 PM");
  });
});

describe("firstName", () => {
  it.each([
    ["Ada Lovelace", "Ada"],
    ["23/IT/004", "23/IT/004"],
    ["  Grace   Hopper ", "Grace"],
    ["", ""],
    [undefined, ""],
  ])("%j -> %j", (name, expected) => {
    expect(firstName(name)).toBe(expected);
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-10-08T12:00:00Z");
  it.each([
    ["2026-10-08T11:59:40Z", "just now"],
    ["2026-10-08T11:55:00Z", "5 minutes ago"],
    ["2026-10-08T09:00:00Z", "3 hours ago"],
    ["2026-10-07T12:00:00Z", "yesterday"],
    ["2026-10-10T12:00:00Z", "in 2 days"],
    ["not a date", ""],
  ])("%s -> %s", (iso, expected) => {
    expect(relativeTime(iso, now)).toBe(expected);
  });
});

describe("parseHomeTab", () => {
  it("accepts known tabs and falls back to recent", () => {
    expect(parseHomeTab("upcoming")).toBe("upcoming");
    expect(parseHomeTab("ai-feed")).toBe("ai-feed");
    expect(parseHomeTab("bogus")).toBe("recent");
    expect(parseHomeTab(null)).toBe("recent");
  });
});
