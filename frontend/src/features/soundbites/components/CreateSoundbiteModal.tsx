"use client";

import { Play, Square } from "lucide-react";
import { useState } from "react";

import { Button, Field, Input, Modal } from "@/components/ui";
import { ApiError, type Soundbite } from "@/lib/api";

import { useClipPlayer } from "../hooks/useClipPlayer";
import { useCreateSoundbite } from "../hooks/useSoundbites";
import { clipRangeError, formatClipRange, type ClipRange } from "../lib/range";
import { RangeStepper } from "./RangeStepper";

const MAX_TITLE = 300;
const PREVIEW_ID = -1;

export type SoundbiteDraft = ClipRange & { title?: string };

export type CreateSoundbiteModalProps = {
  meetingId: number;
  durationMs: number;
  /** Opens the modal with this starting range; null closes it. */
  draft: SoundbiteDraft | null;
  onClose: () => void;
  onCreated?: (soundbite: Soundbite) => void;
};

export function CreateSoundbiteModal({
  meetingId,
  durationMs,
  draft,
  onClose,
  onCreated,
}: CreateSoundbiteModalProps) {
  return (
    <Modal
      open={draft !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Create soundbite"
      description="Clip a moment of the recording to replay or share."
      size="sm"
    >
      {/* Keyed by the draft so each opening starts from its own range. */}
      {draft && (
        <DraftForm
          key={`${draft.start_ms}-${draft.end_ms}`}
          meetingId={meetingId}
          durationMs={durationMs}
          draft={draft}
          onDone={onClose}
          onCreated={onCreated}
        />
      )}
    </Modal>
  );
}

/** Whole seconds read better in the steppers; the end may not pass the recording. */
function snap({ start_ms, end_ms }: ClipRange, durationMs: number): ClipRange {
  return {
    start_ms: Math.floor(start_ms / 1000) * 1000,
    end_ms: Math.min(durationMs, Math.ceil(end_ms / 1000) * 1000),
  };
}

function DraftForm({
  meetingId,
  durationMs,
  draft,
  onDone,
  onCreated,
}: {
  meetingId: number;
  durationMs: number;
  draft: SoundbiteDraft;
  onDone: () => void;
  onCreated?: (soundbite: Soundbite) => void;
}) {
  const [range, setRange] = useState(() => snap(draft, durationMs));
  const [title, setTitle] = useState(() => (draft.title ?? "").slice(0, MAX_TITLE));
  const [serverError, setServerError] = useState<string | null>(null);
  const create = useCreateSoundbite(meetingId);
  // Closing the modal any way (Cancel, Esc, overlay) unmounts this form, which ends a preview.
  const preview = useClipPlayer({ pauseOnUnmount: true });
  const error = clipRangeError(range, durationMs) ?? serverError;
  const previewing = preview.playingId === PREVIEW_ID;

  const update = (next: Partial<ClipRange>) => {
    setRange((r) => ({ ...r, ...next }));
    setServerError(null);
  };

  const submit = async () => {
    if (clipRangeError(range, durationMs)) return;
    try {
      const saved = await create.mutateAsync({ ...range, title: title.trim() || null });
      preview.stop();
      onDone();
      onCreated?.(saved);
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Couldn't create the soundbite.");
    }
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Field
        label="Title"
        htmlFor="soundbite-title"
        hint="Optional: defaults to the first words spoken."
      >
        <Input
          id="soundbite-title"
          value={title}
          maxLength={MAX_TITLE}
          placeholder="Untitled soundbite"
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <div className="flex items-end gap-6">
        <RangeStepper
          label="Start"
          ms={range.start_ms}
          min={0}
          max={range.end_ms - 1_000}
          onChange={(start_ms) => update({ start_ms })}
        />
        <RangeStepper
          label="End"
          ms={range.end_ms}
          min={range.start_ms + 1_000}
          max={durationMs}
          onChange={(end_ms) => update({ end_ms })}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="tnum text-meta text-muted">{formatClipRange(range)}</span>
        <Button
          size="sm"
          variant="ghost"
          leadingIcon={previewing ? <Square strokeWidth={1.75} /> : <Play strokeWidth={1.75} />}
          onClick={() => (previewing ? preview.stop() : preview.play({ ...range, id: PREVIEW_ID }))}
        >
          {previewing ? "Stop" : "Preview"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-caption text-danger-strong">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button
          variant="ghost"
          onClick={() => {
            preview.stop();
            onDone();
          }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={create.isPending}
          disabled={Boolean(error)}
        >
          Create soundbite
        </Button>
      </div>
    </form>
  );
}
