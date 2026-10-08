import type { Summary } from "@/lib/api";

import { attachNoteRanges, buildChapters, formatChapterRange, formatChapterTime } from "./chapters";
import { getTemplate, type SectionId, type TemplateId } from "./templates";

export type MarkdownOptions = {
  title?: string;
  durationMs: number;
  template?: TemplateId;
};

/**
 * The summary as Markdown, in the active template's order and headings, since
 * a copied summary is pasted into docs and chat that understand headings and
 * bullets. Empty sections are omitted (a bare heading reads as truncated).
 * Action items belong to another feature and are not included.
 */
export function summaryToMarkdown(summary: Summary, options: MarkdownOptions): string {
  const chapters = buildChapters(summary.outline, options.durationMs);

  const render: Record<SectionId, () => string | null> = {
    keywords: () => (summary.keywords.length ? summary.keywords.join(" · ") : null),
    overview: () => summary.overview.trim() || null,
    outline: () =>
      chapters.length
        ? chapters
            .map((c) =>
              c.startMs === null
                ? `- ${c.title}`
                : `- \`${formatChapterTime(c.startMs)}\` ${c.title}`,
            )
            .join("\n")
        : null,
    notes: () =>
      summary.notes.length
        ? attachNoteRanges(summary.notes, chapters)
            .map((n) => {
              const range = n.range ? formatChapterRange(n.range) : "";
              const heading = range ? `### ${n.title}: ${range}` : `### ${n.title}`;
              return [heading, "", ...n.bullets.map((b) => `- ${b}`)].join("\n");
            })
            .join("\n\n")
        : null,
    actionItems: () => null,
  };

  const blocks: string[] = options.title ? [`# ${options.title}`] : [];
  for (const { id, label } of getTemplate(options.template ?? "general").sections) {
    const body = render[id]();
    if (body) blocks.push(`## ${label}\n\n${body}`);
  }
  return `${blocks.join("\n\n")}\n`;
}
