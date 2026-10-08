import { describe, expect, it } from "vitest";

import { TAG_COLOR_COUNT, sameTagName, tagColorIndex, tagHue, tagToneClass } from "./color";

describe("tag colour", () => {
  it("is stable: the same name always hashes to the same swatch", () => {
    const first = tagColorIndex("Launch");
    for (let i = 0; i < 5; i++) expect(tagColorIndex("Launch")).toBe(first);
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
  });

  it("shows the stored colour_index, so a rename keeps the colour", () => {
    const before = { name: "Launch", color_index: 3 };
    const renamed = { name: "Launch Q4", color_index: 3 };
    expect(tagToneClass(before)).toBe("bg-tag-subtle-3 text-tag-3");
    expect(tagToneClass(renamed)).toBe(tagToneClass(before));
  });

  it("falls back to the name hash without a valid stored index", () => {
    expect(tagHue({ name: "Launch" })).toBe(tagColorIndex("Launch"));
    expect(tagHue({ name: "Launch", color_index: 99 })).toBe(tagColorIndex("Launch"));
    expect(tagHue({ name: "Launch", color_index: null })).toBe(tagColorIndex("Launch"));
  });
});
