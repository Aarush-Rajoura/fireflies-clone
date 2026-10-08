import { describe, expect, it } from "vitest";

import { getTemplate, NOTE_TEMPLATES, SECTION_ORDER } from "./templates";

describe("note templates", () => {
  it("keeps the canonical five-section order", () => {
    expect(SECTION_ORDER).toEqual(["keywords", "overview", "outline", "notes", "actionItems"]);
  });

  it("General shows every section in canonical order with default labels", () => {
    const general = getTemplate("general");
    expect(general.sections.map((s) => s.id)).toEqual(SECTION_ORDER);
    expect(general.sections.map((s) => s.label)).toEqual([
      "Keywords",
      "Meeting Overview",
      "Meeting Outline",
      "Bullet-Point Notes",
      "Action Items",
    ]);
  });

  it("other templates reorder and relabel without inventing sections", () => {
    expect(getTemplate("standup").sections.map((s) => s.id)).toEqual([
      "actionItems",
      "notes",
      "overview",
    ]);
    expect(getTemplate("sales").sections[2]).toEqual({ id: "actionItems", label: "Next Steps" });
    for (const t of NOTE_TEMPLATES) {
      const ids = t.sections.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      ids.forEach((id) => expect(SECTION_ORDER).toContain(id));
    }
  });

  it("falls back to General for an unknown id", () => {
    expect(getTemplate("nope").id).toBe("general");
  });

  it("offers General, Sales, Standup and 1:1", () => {
    expect(NOTE_TEMPLATES.map((t) => t.label)).toEqual(["General", "Sales", "Standup", "1:1"]);
  });
});
