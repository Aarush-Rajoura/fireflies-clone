"use client";

import { usePlayerControls } from "@/features/player";

import { formatChapterRange, type NoteChapter } from "../lib/chapters";
import { SummarySection } from "./SummarySection";

export function NotesSection({ label, notes }: { label: string; notes: readonly NoteChapter[] }) {
  const { seek } = usePlayerControls();
  if (notes.length === 0) return null;
  return (
    <SummarySection label={label}>
      <div className="flex flex-col gap-4">
        {notes.map((note, i) => {
          const start = note.range?.startMs ?? null;
          const range = note.range ? formatChapterRange(note.range) : "";
          return (
            <div key={i} className="flex flex-col gap-1.5">
              <h4 className="text-body-strong text-primary">
                {note.title}
                {range && start !== null && (
                  <>
                    {": "}
                    <button
                      type="button"
                      onClick={() => seek(start)}
                      aria-label={`Jump to ${note.title} at ${range}`}
                      className="tnum rounded-tag text-accent hover:underline"
                    >
                      {range}
                    </button>
                  </>
                )}
              </h4>
              <ul className="flex list-[square] flex-col gap-1 pl-5 marker:text-muted">
                {note.bullets.map((b, j) => (
                  <li key={j} className="text-body text-primary">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </SummarySection>
  );
}
