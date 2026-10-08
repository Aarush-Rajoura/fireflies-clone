/*
 * Markdown-lite, the format AskFred replies in: `## `/`### ` headings, `- `
 * bullets, `**bold**` and `[n]` citation markers. Parsed into plain data and
 * rendered as React elements, so reply text is never injected as HTML.
 */

export type Inline =
  { kind: "text"; text: string } | { kind: "bold"; text: string } | { kind: "cite"; n: number };

export type Block =
  | { kind: "heading"; level: 2 | 3; inlines: Inline[] }
  | { kind: "list"; items: Inline[][] }
  | { kind: "paragraph"; inlines: Inline[] };

const TOKEN = /\*\*(.+?)\*\*|\[(\d{1,3})\]/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const at = match.index ?? 0;
    if (at > last) out.push({ kind: "text", text: text.slice(last, at) });
    if (match[1] !== undefined) out.push({ kind: "bold", text: match[1] });
    else out.push({ kind: "cite", n: Number(match[2]) });
    last = at + match[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

const HEADING = /^(#{1,3})\s+(.*)$/;
const BULLET = /^\s*[-*•]\s+(.*)$/;

export function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: Inline[][] | null = null;

  const flush = () => {
    if (paragraph.length)
      blocks.push({ kind: "paragraph", inlines: parseInline(paragraph.join(" ")) });
    if (list) blocks.push({ kind: "list", items: list });
    paragraph = [];
    list = null;
  };

  for (const raw of source.split("\n")) {
    const line = raw.trimEnd();
    const heading = HEADING.exec(line);
    const bullet = BULLET.exec(line);
    if (!line.trim()) {
      flush();
    } else if (heading) {
      flush();
      const level = (heading[1] ?? "").length <= 2 ? 2 : 3;
      blocks.push({ kind: "heading", level, inlines: parseInline(heading[2] ?? "") });
    } else if (bullet) {
      if (paragraph.length) flush();
      list ??= [];
      list.push(parseInline(bullet[1] ?? ""));
    } else {
      if (list) flush();
      paragraph.push(line.trim());
    }
  }
  flush();
  return blocks;
}
