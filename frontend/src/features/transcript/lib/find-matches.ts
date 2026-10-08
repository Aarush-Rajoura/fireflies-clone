import type { HighlightRange } from "@/components/ui";

export type Match = { segmentIndex: number; start: number; end: number };

const MARKS = /\p{M}/gu;

/** Case- and accent-folds one piece of text: "É" → "e". */
function fold(text: string): string {
  return text.normalize("NFD").replace(MARKS, "").toLowerCase().normalize("NFD").replace(MARKS, "");
}

type Folded = {
  text: string;
  /** For each folded code unit: where its source character starts in the original. */
  starts: number[];
  /** For each folded code unit: where its source character (plus trailing marks) ends. */
  ends: number[];
};

/**
 * Folds `text` one character at a time so every folded offset maps back to the
 * original string. Folding the whole string at once would shift offsets
 * ("é" is one unit, NFD makes it two) and the highlight would land on the
 * wrong letters.
 */
function foldWithOffsets(text: string): Folded {
  let folded = "";
  const starts: number[] = [];
  const ends: number[] = [];
  let i = 0;
  for (const ch of text) {
    const piece = fold(ch);
    const end = i + ch.length;
    if (piece.length === 0) {
      // A lone combining mark belongs to the letter before it, so the highlight covers it too.
      if (ends.length > 0) ends[ends.length - 1] = end;
    } else {
      for (let k = 0; k < piece.length; k++) {
        starts.push(i);
        ends.push(end);
      }
      folded += piece;
    }
    i = end;
  }
  return { text: folded, starts, ends };
}

/**
 * Every occurrence of `query` in the segments, as offsets into each segment's
 * ORIGINAL text. Matching is literal (`indexOf`, never a RegExp built from
 * input), so `c++`, `(draft)` or `"*` mean exactly those characters.
 * Case- and diacritic-insensitive: "cafe" finds "Café".
 */
export function findMatches(segments: readonly { text: string }[], query: string): Match[] {
  const needle = fold(query.trim());
  if (!needle) return [];

  const matches: Match[] = [];
  segments.forEach((segment, segmentIndex) => {
    const hay = foldWithOffsets(segment.text);
    let from = 0;
    for (;;) {
      const at = hay.text.indexOf(needle, from);
      if (at === -1) break;
      const last = at + needle.length - 1;
      matches.push({
        segmentIndex,
        start: hay.starts[at] ?? 0,
        end: hay.ends[last] ?? segment.text.length,
      });
      from = at + needle.length;
    }
  });
  return matches;
}

export type SegmentMatches = {
  ranges: HighlightRange[];
  /** Global index of this segment's first match, to turn "3 of 11" into a per-row index. */
  offset: number;
};

/** Groups matches by segment so each row gets one stable `ranges` array. */
export function matchesBySegment(matches: readonly Match[]): Map<number, SegmentMatches> {
  const out = new Map<number, SegmentMatches>();
  matches.forEach((m, index) => {
    const entry = out.get(m.segmentIndex);
    if (entry) entry.ranges.push({ start: m.start, end: m.end });
    else out.set(m.segmentIndex, { ranges: [{ start: m.start, end: m.end }], offset: index });
  });
  return out;
}

/** Steps through matches, wrapping at both ends; -1 when there are none. */
export function stepMatch(current: number, total: number, direction: 1 | -1): number {
  if (total === 0) return -1;
  if (current < 0) return direction === 1 ? 0 : total - 1;
  return (current + direction + total) % total;
}
