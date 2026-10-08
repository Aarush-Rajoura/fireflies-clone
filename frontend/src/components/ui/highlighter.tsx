import { Fragment, memo } from "react";

import { cn } from "@/lib/utils/cn";

/** The user-chosen highlight colours; each maps to a theme token, never a hex. */
export const HIGHLIGHT_TONES = ["yellow", "green", "blue", "pink", "purple"] as const;
export type HighlightTone = (typeof HIGHLIGHT_TONES)[number];

/**
 * A half-open `[start, end)` range of string indices. Without `tone` it is a
 * search match (`activeIndex` counts these); with `tone` it is a saved
 * highlight, and `id` is rendered as `data-range-id` so callers can find it.
 */
export type HighlightRange = {
  start: number;
  end: number;
  tone?: HighlightTone;
  id?: string | number;
};

export type HighlighterProps = {
  text: string;
  ranges: readonly HighlightRange[];
  /** Index into `ranges` of the current match (search "n of m"). */
  activeIndex?: number;
  className?: string;
};

/** A run of text; `match` and `tone` are indices into `ranges` of what covers it. */
type Piece = { text: string; match?: number; tone?: number };

export const toneClasses: Record<HighlightTone, string> = {
  yellow: "bg-annotate-yellow",
  green: "bg-annotate-green",
  blue: "bg-annotate-blue",
  pink: "bg-annotate-pink",
  purple: "bg-annotate-purple",
};

type Interval = { start: number; end: number; index: number };

/** The ranges of one layer (toned or not), clamped to the text; empty and inverted ones dropped. */
function clean(text: string, ranges: readonly HighlightRange[], toned: boolean): Interval[] {
  const len = text.length;
  return ranges
    .map((r, index) => ({
      start: Math.max(0, Math.min(len, Math.floor(r.start))),
      end: Math.max(0, Math.min(len, Math.floor(r.end))),
      index,
      toned: r.tone !== undefined,
    }))
    .filter(
      (r) =>
        r.toned === toned && Number.isFinite(r.start) && Number.isFinite(r.end) && r.end > r.start,
    )
    .map(({ start, end, index }) => ({ start, end, index }));
}

/** Search matches: non-overlapping; on overlap the earlier-starting match keeps the text. */
function searchLayer(text: string, ranges: readonly HighlightRange[]): Interval[] {
  const sorted = clean(text, ranges, false).sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Interval[] = [];
  let cursor = 0;
  for (const r of sorted) {
    const start = Math.max(r.start, cursor);
    if (start >= r.end) continue;
    out.push({ start, end: r.end, index: r.index });
    cursor = r.end;
  }
  return out;
}

const coveringAt = (intervals: Interval[], at: number) =>
  intervals.find((r) => r.start <= at && at < r.end)?.index;

/** Saved highlights are painted in input order: where they overlap, the later (newer) one shows. */
const topmostAt = (intervals: Interval[], at: number) => {
  let top: number | undefined;
  for (const r of intervals) if (r.start <= at && at < r.end) top = r.index;
  return top;
};

/**
 * Splits text into pieces tagged with the search match and the saved highlight
 * covering each. Matches and highlights are two layers that may overlap each
 * other. Overlapping matches are trimmed; overlapping highlights show the
 * later one, so a highlight nested inside another stays visible. Every
 * character is rendered exactly once. Pure, so it is unit-tested directly.
 */
export function segment(text: string, ranges: readonly HighlightRange[]): Piece[] {
  const search = searchLayer(text, ranges);
  const tones = clean(text, ranges, true);
  const cuts = new Set([0, text.length]);
  for (const r of [...search, ...tones]) cuts.add(r.start).add(r.end);
  const points = [...cuts].sort((a, b) => a - b);

  const out: Piece[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i] as number;
    const to = points[i + 1] as number;
    const match = coveringAt(search, from);
    const tone = topmostAt(tones, from);
    const last = out[out.length - 1];
    if (last && last.match === match && last.tone === tone) {
      last.text += text.slice(from, to);
      continue;
    }
    const piece: Piece = { text: text.slice(from, to) };
    if (match !== undefined) piece.match = match;
    if (tone !== undefined) piece.tone = tone;
    out.push(piece);
  }
  return out;
}

/**
 * Wraps matches and highlights in <mark>. Where a search match crosses a saved
 * highlight the search styling wins, so "n of m" stays visible. Text is always
 * rendered as React text nodes, never as HTML, so `<script>` displays literally.
 */
export const Highlighter = memo(function Highlighter({
  text,
  ranges,
  activeIndex,
  className,
}: HighlighterProps) {
  if (ranges.length === 0) return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      {segment(text, ranges).map((s, i) => {
        if (s.match === undefined && s.tone === undefined) {
          return <Fragment key={i}>{s.text}</Fragment>;
        }
        const highlight = s.tone === undefined ? undefined : ranges[s.tone];
        const isSearch = s.match !== undefined;
        return (
          <mark
            key={i}
            data-match-index={s.match}
            data-tone={highlight?.tone}
            data-range-id={highlight?.id}
            // Generated content, not a text node: the line's textContent must stay its exact text.
            data-sr-label={highlight?.tone && ` (highlighted ${highlight.tone})`}
            aria-current={isSearch && s.match === activeIndex ? "true" : undefined}
            className={cn(
              "rounded-tag text-strong",
              highlight?.tone && "after:sr-only after:content-[attr(data-sr-label)]",
              isSearch
                ? s.match === activeIndex
                  ? "bg-highlight-active"
                  : "bg-highlight"
                : highlight?.tone && toneClasses[highlight.tone],
            )}
          >
            {s.text}
          </mark>
        );
      })}
    </span>
  );
});
