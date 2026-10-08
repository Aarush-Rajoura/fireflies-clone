import type { ExportFormat } from "@/lib/api";

export type ExportSection = "summary" | "action_items" | "transcript";

/** Display order, which is also the order the file lays them out in. */
export const EXPORT_SECTIONS: readonly { id: ExportSection; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "action_items", label: "Action items" },
  { id: "transcript", label: "Transcript" },
];

export const EXPORT_FORMATS: readonly { value: ExportFormat; label: string }[] = [
  { value: "md", label: "Markdown" },
  { value: "txt", label: "Text" },
  { value: "pdf", label: "PDF" },
];

const KNOWN = new Set<string>(EXPORT_SECTIONS.map((s) => s.id));

export class EmptyExportError extends Error {
  constructor() {
    super("Pick at least one section to export.");
    this.name = "EmptyExportError";
  }
}

/**
 * Deduped, unknown-free, in canonical order, so one choice always yields one
 * URL. An empty result is refused here because the backend answers it with 422.
 */
export function normalizeSections(selected: Iterable<string>): ExportSection[] {
  const chosen = new Set([...selected].filter((s) => KNOWN.has(s)));
  const ordered = EXPORT_SECTIONS.map((s) => s.id).filter((id) => chosen.has(id));
  if (ordered.length === 0) throw new EmptyExportError();
  return ordered;
}
