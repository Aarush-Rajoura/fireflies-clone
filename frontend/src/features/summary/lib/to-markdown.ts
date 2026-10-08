import type { Summary } from "@/lib/api";

import { attachNoteRanges, buildChapters, formatChapterRange, formatChapterTime } from "./chapters";
import { getTemplate, type SectionId, type TemplateId } from "./templates";

/**
 * AI/user text must not become markup: a stray `*` or `[` would restyle or
 * link the paste. Inline contexts (titles, bullets, pills) also fold newlines,
 * which would otherwise break a bullet or heading in two.
 */
export function escapeMd(text: string, { inline = true } = {}): string {
  const escaped = text.replace(/[\\`*_#[\]]/g, "\\$&");
  return inline ? escaped.replace(/\s*\n\s*/g, " ").trim() : escaped.trim();
}

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
    keywords: () =>
      summary.keywords.length ? summary.keywords.map((k) => escapeMd(k)).join(" · ") : null,
    overview: () => escapeMd(summary.overview, { inline: false }) || null,
    outline: () =>
      chapters.length
        ? chapters
            .map((c) =>
              c.startMs === null
                ? `- ${escapeMd(c.title)}`
                : `- \`${formatChapterTime(c.startMs)}\` ${escapeMd(c.title)}`,
            )
            .join("\n")
        : null,
    notes: () =>
      summary.notes.length
        ? attachNoteRanges(summary.notes, chapters)
            .map((n) => {
              const range = n.range ? formatChapterRange(n.range) : "";
              const title = escapeMd(n.title);
              const heading = range ? `### ${title}: ${range}` : `### ${title}`;
              return [heading, "", ...n.bullets.map((b) => `- ${escapeMd(b)}`)].join("\n");
            })
            .join("\n\n")
        : null,
    actionItems: () => null,
  };

  const blocks: string[] = options.title ? [`# ${escapeMd(options.title)}`] : [];
  for (const { id, label } of getTemplate(options.template ?? "general").sections) {
    const body = render[id]();
    if (body) blocks.push(`## ${label}\n\n${body}`);
  }
  return `${blocks.join("\n\n")}\n`;
}
