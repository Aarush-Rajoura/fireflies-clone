"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";

import { FloatingToolbar, HIGHLIGHT_TONES, IconButton, ToneSwatch } from "@/components/ui";

import type { HighlightEditTarget } from "../hooks/useHighlightEditor";
import { useDeleteHighlight, useRecolorHighlight } from "../hooks/useHighlightMutations";
import { useHighlights } from "../hooks/useHighlights";

export type HighlightEditorProps = {
  meetingId: number;
  target: HighlightEditTarget | null;
  onClose: () => void;
  /** Called while the page scrolls, so the toolbar can follow its highlight. */
  onReposition: () => void;
};

/** Recolour or remove a saved highlight; opens when one is clicked in the transcript. */
export function HighlightEditor({
  meetingId,
  target,
  onClose,
  onReposition,
}: HighlightEditorProps) {
  const highlight = useHighlights(meetingId).data?.find((h) => h.id === target?.id);
  const recolor = useRecolorHighlight(meetingId);
  const remove = useDeleteHighlight(meetingId);
  const ref = useRef<HTMLDivElement>(null);
  const open = Boolean(target && highlight);

  // Dismiss on a press elsewhere or Escape; follow the mark while the transcript scrolls.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, onClose, onReposition]);

  if (!target || !highlight) return null;

  return (
    <FloatingToolbar ref={ref} anchor={target.anchor} label="Edit highlight">
      <div role="group" aria-label="Highlight colour" className="flex items-center gap-1 px-1">
        {HIGHLIGHT_TONES.map((tone) => (
          <ToneSwatch
            key={tone}
            tone={tone}
            label={`Highlight ${tone}`}
            selected={highlight.color === tone}
            onClick={() => {
              if (tone !== highlight.color) recolor.mutate({ id: highlight.id, color: tone });
              onClose();
            }}
          />
        ))}
      </div>
      <span aria-hidden className="mx-1 h-5 w-px bg-divider" />
      <IconButton
        label="Remove highlight"
        size="sm"
        icon={<Trash2 strokeWidth={1.75} />}
        onClick={() => {
          remove.mutate(highlight.id);
          onClose();
        }}
      />
    </FloatingToolbar>
  );
}
