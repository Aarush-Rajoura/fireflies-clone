import { describe, expect, it } from "vitest";

import { presetRange, recognizePreset } from "./date-presets";

const NOW = new Date(2026, 9, 8, 12, 0); // local 8 Oct 2026

describe("date presets", () => {
  it("computes inclusive ranges ending today", () => {
    expect(presetRange("today", NOW)).toEqual({ date_from: "2026-10-08", date_to: "2026-10-08" });
    expect(presetRange("last-7", NOW)).toEqual({ date_from: "2026-10-02", date_to: "2026-10-08" });
    expect(presetRange("last-30", NOW)).toEqual({ date_from: "2026-09-09", date_to: "2026-10-08" });
    expect(presetRange("any", NOW)).toEqual({});
  });

  it("recognises a preset from its range so a shared link relights it", () => {
    expect(recognizePreset({}, NOW)).toBe("any");
    expect(recognizePreset(presetRange("last-7", NOW), NOW)).toBe("last-7");
    expect(recognizePreset({ date_from: "2026-01-01" }, NOW)).toBe("custom");
  });
});
