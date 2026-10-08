"use client";

import { useState, type FormEvent } from "react";

import { Button, Field, Input, Modal } from "@/components/ui";
import type { Speaker } from "@/lib/api";

import { speakerName } from "./SpeakerHeader";

const MAX_NAME = 100;

export type RenameSpeakerModalProps = {
  speaker: Speaker | null;
  onClose: () => void;
  onSubmit: (speakerId: number, name: string) => void;
};

/** Closes straight away on save: the rename is optimistic and rolls back with a toast on failure. */
export function RenameSpeakerModal({ speaker, onClose, onSubmit }: RenameSpeakerModalProps) {
  return (
    <Modal
      open={speaker !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Rename speaker"
      description="The new name is used everywhere this speaker appears in the meeting."
      size="sm"
    >
      {/* Keyed so the field starts from the chosen speaker's name each time. */}
      {speaker && <RenameForm key={speaker.id} speaker={speaker} onClose={onClose} onSubmit={onSubmit} />}
    </Modal>
  );
}

function RenameForm({ speaker, onClose, onSubmit }: { speaker: Speaker } & Omit<RenameSpeakerModalProps, "speaker">) {
  const [name, setName] = useState(speakerName(speaker));
  const trimmed = name.trim();
  const changed = trimmed !== speakerName(speaker);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed) return;
    if (changed) onSubmit(speaker.id, trimmed);
    onClose();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Speaker name" htmlFor="rename-speaker-name" error={trimmed ? undefined : "Enter a name."}>
        <Input
          id="rename-speaker-name"
          autoFocus
          maxLength={MAX_NAME}
          value={name}
          invalid={!trimmed}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!trimmed}>
          Save
        </Button>
      </div>
    </form>
  );
}
