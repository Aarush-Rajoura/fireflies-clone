"use client";

import { useState, type FormEvent } from "react";

import { Button, Field, Input, Modal } from "@/components/ui";
import type { Channel } from "@/lib/api";

import { isDuplicateName, useCreateChannel, useRenameChannel } from "../hooks/useChannelMutations";

export type CreateChannelModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Given: rename this channel. Absent: create a new one. */
  channel?: Channel;
  onCreated?: (channel: Channel) => void;
};

const MAX_NAME = 100;

/** Create or rename a channel. Errors stay in the form so the typed name isn't lost. */
export function CreateChannelModal({
  open,
  onOpenChange,
  channel,
  onCreated,
}: CreateChannelModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={channel ? "Rename channel" : "Create channel"}
      description={
        channel ? undefined : "Channels group related meetings, e.g. by team or customer."
      }
      size="sm"
    >
      {/* Keyed so each opening starts from a fresh form. */}
      {open && (
        <ChannelForm
          key={channel?.id ?? "new"}
          channel={channel}
          onDone={(saved) => {
            if (!channel) onCreated?.(saved);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </Modal>
  );
}

function ChannelForm({
  channel,
  onDone,
  onCancel,
}: {
  channel?: Channel;
  onDone: (channel: Channel) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(channel?.name ?? "");
  const create = useCreateChannel();
  const rename = useRenameChannel();
  const mutation = channel ? rename : create;
  const trimmed = name.trim();

  const error = mutation.error
    ? isDuplicateName(mutation.error)
      ? `A channel named “${trimmed}” already exists.`
      : mutation.error.message || "Couldn't save the channel. Please try again."
    : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed || mutation.isPending) return;
    if (channel) {
      if (trimmed === channel.name) return onCancel();
      rename.mutate({ id: channel.id, name: trimmed }, { onSuccess: onDone });
    } else {
      create.mutate(trimmed, { onSuccess: onDone });
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Field label="Channel name" htmlFor="channel-name" error={error}>
        <Input
          id="channel-name"
          autoFocus
          value={name}
          maxLength={MAX_NAME}
          placeholder="e.g. sales-calls"
          invalid={Boolean(error)}
          onChange={(e) => {
            setName(e.target.value);
            if (mutation.isError) mutation.reset();
          }}
        />
      </Field>
      <div className="flex justify-end gap-2 pb-2">
        <Button variant="ghost" onClick={onCancel} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!trimmed} loading={mutation.isPending}>
          {channel ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  );
}
