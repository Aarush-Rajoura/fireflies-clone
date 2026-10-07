import { Fragment, memo } from "react";

import { cn } from "@/lib/utils/cn";

export type HighlightRange = { start: number; end: number };

export type HighlighterProps = {
  text: string;
  ranges: readonly HighlightRange[];
  /** Index into `ranges` of the current match (search "n of m"). */
  activeIndex?: number;
  className?: string;
};

type Segment = { text: string; match?: number };

/**
 * Splits text into plain and matched segments. Ranges are clamped to the text,
 * empty/inverted ones dropped, and overlaps trimmed so that every character is
 * rendered exactly once. Pure, so it is unit-tested directly.
 */
export function segment(text: string, ranges: readonly HighlightRange[]): Segment[] {
  const len = text.length;
  const clean = ranges
    .map((r, index) => ({
      start: Math.max(0, Math.min(len, Math.floor(r.start))),
      end: Math.max(0, Math.min(len, Math.floor(r.end))),
      index,
    }))
    .filter((r) => Number.isFinite(r.start) && Number.isFinite(r.end) && r.end > r.start)
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const out: Segment[] = [];
  let cursor = 0;
  for (const r of clean) {
    const start = Math.max(r.start, cursor);
    if (start >= r.end) continue;
    if (start > cursor) out.push({ text: text.slice(cursor, start) });
    out.push({ text: text.slice(start, r.end), match: r.index });
    cursor = r.end;
  }
  if (cursor < len) out.push({ text: text.slice(cursor) });
  return out;
}

/**
 * Wraps matches in <mark>. Text is always rendered as React text nodes, never
 * as HTML, so user content like `<script>` displays literally.
 */
export const Highlighter = memo(function Highlighter({ text, ranges, activeIndex, className }: HighlighterProps) {
  if (ranges.length === 0) return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      {segment(text, ranges).map((s, i) =>
        s.match === undefined ? (
          <Fragment key={i}>{s.text}</Fragment>
        ) : (
          <mark
            key={i}
            data-match-index={s.match}
            aria-current={s.match === activeIndex ? "true" : undefined}
            className={cn(
              "rounded-xs text-strong",
              s.match === activeIndex ? "bg-highlight-active" : "bg-highlight",
            )}
          >
            {s.text}
          </mark>
        ),
      )}
    </span>
  );
});
