/*
 * Note templates change only how the same summary is PRESENTED: which sections
 * show, in what order, under which headings. They never refetch or rewrite data.
 */

export type SectionId = "keywords" | "overview" | "outline" | "notes" | "actionItems";

/** The canonical order every summary follows unless a template says otherwise. */
export const SECTION_ORDER: readonly SectionId[] = [
  "keywords",
  "overview",
  "outline",
  "notes",
  "actionItems",
];

export const DEFAULT_SECTION_LABELS: Record<SectionId, string> = {
  keywords: "Keywords",
  overview: "Meeting Overview",
  outline: "Meeting Outline",
  notes: "Bullet-Point Notes",
  actionItems: "Action Items",
};

export type TemplateId = "general" | "sales" | "standup" | "one-on-one";

export type TemplateSection = { id: SectionId; label: string };

export type NoteTemplate = { id: TemplateId; label: string; sections: readonly TemplateSection[] };

const section = (id: SectionId, label = DEFAULT_SECTION_LABELS[id]): TemplateSection => ({
  id,
  label,
});

export const NOTE_TEMPLATES: readonly NoteTemplate[] = [
  { id: "general", label: "General", sections: SECTION_ORDER.map((id) => section(id)) },
  {
    id: "sales",
    label: "Sales",
    sections: [
      section("overview", "Deal Overview"),
      section("notes", "Discussion Notes"),
      section("actionItems", "Next Steps"),
      section("keywords", "Topics Mentioned"),
      section("outline"),
    ],
  },
  {
    id: "standup",
    label: "Standup",
    // A standup is read for who does what next, so tasks lead.
    sections: [
      section("actionItems", "Tasks & Blockers"),
      section("notes", "Updates"),
      section("overview", "Summary"),
    ],
  },
  {
    id: "one-on-one",
    label: "1:1",
    sections: [
      section("overview", "Check-in"),
      section("notes", "Talking Points"),
      section("actionItems", "Follow-ups"),
    ],
  },
];

export const DEFAULT_TEMPLATE_ID: TemplateId = "general";

export function getTemplate(id: string): NoteTemplate {
  return NOTE_TEMPLATES.find((t) => t.id === id) ?? (NOTE_TEMPLATES[0] as NoteTemplate);
}

export function isTemplateId(value: string): value is TemplateId {
  return NOTE_TEMPLATES.some((t) => t.id === value);
}
