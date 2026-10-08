"use client";

import { Copy, MessageSquarePlus, Scissors } from "lucide-react";
import type { RefObject } from "react";

import {
  FloatingToolbar,
  HIGHLIGHT_TONES,
  IconButton,
  ToneSwatch,
  toast,
} from "@/components/ui";

import { useCreateHighlight } from "../hooks/useHighlightMutations";
import { useTranscriptSelection } from "../hooks/useTranscriptSelection";
import type { SegmentSelection } from "../lib/selection";

export type SelectionToolbarProps = {
  meetingId: number;
  /** The element holding the transcript lines; selections elsewhere are ignored. */
  scopeRef: RefObject<HTMLElement | null>;
  onComment: (selection: SegmentSelection) => void;
  onCreateSoundbite: (selection: SegmentSelection) => void;
};

/**
 * Floats over text selected inside one transcript line: highlight in a colour,
 * comment on the line, clip it as a soundbite, or copy it. A selection across
 * lines gets a hint instead, since annotations belong to a single line.
 */
export function SelectionToolbar({
  meetingId,
  scopeRef,
  onComment,
  onCreateSoundbite,
}: SelectionToolbarProps) {
  const { state, clear } = useTranscriptSelection(scopeRef);
  const highlight = useCreateHighlight(meetingId);

  if (!state) return null;

  if (state.kind === "cross-segment") {
    return (
      <FloatingToolbar anchor={state.anchor} label="Selection hint" className="px-3 py-1.5">
        <p role="status" className="text-caption text-secondary">
          Select text within a single line to highlight, comment or clip it.
        </p>
      </FloatingToolbar>
    );
  }

  const { selection } = state;
  const act = (fn: (s: SegmentSelection) => void) => () => {
    fn(selection);
    clear();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(selection.text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy. Use Ctrl+C instead.");
    }
  };

  return (
    <FloatingToolbar anchor={state.anchor} label="Annotate selection">
      <div role="group" aria-label="Highlight" className="flex items-center gap-1 px-1">
        {HIGHLIGHT_TONES.map((tone) => (
          <ToneSwatch
            key={tone}
            tone={tone}
            label={`Highlight ${tone}`}
            onClick={act((s) =>
              highlight.mutate({
                segment_id: s.segmentId,
                start_offset: s.start,
                end_offset: s.end,
                color: tone,
              }),
            )}
          />
        ))}
      </div>
      <span aria-hidden className="mx-1 h-5 w-px bg-divider" />
      <IconButton
        label="Comment"
        size="sm"
        icon={<MessageSquarePlus strokeWidth={1.75} />}
        onClick={act(onComment)}
      />
      <IconButton
        label="Create soundbite"
        size="sm"
        icon={<Scissors strokeWidth={1.75} />}
        onClick={act(onCreateSoundbite)}
      />
      <IconButton
        label="Copy"
        size="sm"
        icon={<Copy strokeWidth={1.75} />}
        onClick={() => {
          void copy();
          clear();
        }}
      />
    </FloatingToolbar>
  );
}
