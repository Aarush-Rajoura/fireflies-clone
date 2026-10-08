import type { Summary } from "@/lib/api";

type OutlineEntry = Summary["outline"][number];
type NoteGroup = Summary["notes"][number];

export type Chapter = {
  title: string;
  /** null when the AI could not anchor the entry to a moment in the recording. */
  startMs: number | null;
  /** Where the next anchored chapter starts, or the meeting's end; null when unknown. */
  endMs: number | null;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Chapter clock, zero-padded like the meeting page: "00:00", "10:12", "1:02:03". */
export function formatChapterTime(ms: number): string {
  const total = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Turns outline starts into ranges. The end of a chapter is the next LATER
 * anchored start (unanchored or out-of-order entries are skipped, so a range
 * never runs backwards), else the meeting's duration.
 */
export function buildChapters(outline: readonly OutlineEntry[], durationMs: number): Chapter[] {
  return outline.map((entry, i) => {
    const start = entry.start_ms;
    if (start === null) return { title: entry.title, startMs: null, endMs: null };
    const next = outline
      .slice(i + 1)
      .find((e) => e.start_ms !== null && e.start_ms > start)?.start_ms;
    const end = next ?? (durationMs > start ? durationMs : null);
    return { title: entry.title, startMs: start, endMs: end ?? null };
  });
}

/** "00:00 – 10:12"; just the start when the end is unknown; empty when unanchored. */
export function formatChapterRange(chapter: Pick<Chapter, "startMs" | "endMs">): string {
  if (chapter.startMs === null) return "";
  const start = formatChapterTime(chapter.startMs);
  return chapter.endMs === null ? start : `${start} – ${formatChapterTime(chapter.endMs)}`;
}

export type NoteChapter = NoteGroup & { range: Chapter | null };

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Note groups carry no times, but each one is written for an outline chapter
 * with the same title. Match by title (each chapter used once, since titles
 * can repeat); if titles don't line up but the counts do, fall back to position.
 */
export function attachNoteRanges(
  notes: readonly NoteGroup[],
  chapters: readonly Chapter[],
): NoteChapter[] {
  const used = new Set<number>();
  const byTitle = notes.map((note) => {
    const idx = chapters.findIndex((c, i) => !used.has(i) && norm(c.title) === norm(note.title));
    if (idx === -1) return null;
    used.add(idx);
    return chapters[idx] ?? null;
  });
  const positional = notes.length === chapters.length;
  return notes.map((note, i) => ({
    ...note,
    range: byTitle[i] ?? (positional ? (chapters[i] ?? null) : null),
  }));
}
