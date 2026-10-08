import { describe, expect, it } from "vitest";

import { TAG_COLOR_COUNT, sameTagName, tagColorIndex, tagToneClass } from "./color";

describe("tag colour", () => {
  it("is stable: the same name always maps to the same swatch", () => {
    const first = tagColorIndex("Launch");
    for (let i = 0; i < 5; i++) expect(tagColorIndex("Launch")).toBe(first);
    expect(tagToneClass("Launch")).toBe(tagToneClass("Launch"));
  });

  it("ignores case and outer whitespace, like the backend's name rule", () => {
    expect(tagColorIndex("  LAUNCH ")).toBe(tagColorIndex("launch"));
    expect(sameTagName(" Launch", "launch ")).toBe(true);
    expect(sameTagName("Launch", "Lunch")).toBe(false);
  });

  it("stays inside the palette and spreads names across it", () => {
    const names = ["Launch", "Hiring", "Pricing", "Q3", "Design", "Ops", "Legal", "Sales", "Infra"];
    const indices = names.map(tagColorIndex);
    for (const i of indices) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(TAG_COLOR_COUNT);
    }
    expect(new Set(indices).size).toBeGreaterThan(3);
    expect(tagToneClass("Launch")).toMatch(/^bg-tag-subtle-[0-7] text-tag-[0-7]$/);
  });
});
