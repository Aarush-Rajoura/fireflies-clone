"use client";

import { useState, type FormEvent } from "react";

import { Button, Field, Input, Select } from "@/components/ui";
import { useChannels } from "@/features/channels";

import { toLocalInputValue, type MeetingDetails } from "../lib/payload";

import { InlineError } from "./InlineError";
import { ParticipantsInput } from "./ParticipantsInput";

const NO_CHANNEL = "none";
const MAX_TITLE = 200;

export type MeetingDetailsFormProps = {
  initialTitle?: string;
  initialParticipants?: string[];
  onSubmit: (details: MeetingDetails) => void;
  onCancel: () => void;
  submitLabel: string;
  /** Message of a failed create, shown above the buttons so the input is kept. */
  error?: string | null;
};

export function MeetingDetailsForm({
  initialTitle = "",
  initialParticipants = [],
  onSubmit,
  onCancel,
  submitLabel,
  error,
}: MeetingDetailsFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [startedAt, setStartedAt] = useState(() => toLocalInputValue(new Date()));
  const [participants, setParticipants] = useState(initialParticipants);
  const [channel, setChannel] = useState(NO_CHANNEL);
  const [touched, setTouched] = useState(false);
  const channels = useChannels();

  const titleError = touched && title.trim() === "" ? "Give the meeting a title." : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (title.trim() === "") return;
    onSubmit({
      title,
      startedAt,
      participants,
      channelId: channel === NO_CHANNEL ? null : Number(channel),
    });
  };

  const channelOptions = [
    { value: NO_CHANNEL, label: "No channel" },
    ...(channels.data ?? []).map((c) => ({ value: String(c.id), label: `#${c.name}` })),
  ];

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="Title" htmlFor="meeting-title" error={titleError}>
        <Input
          id="meeting-title"
          value={title}
          required
          maxLength={MAX_TITLE}
          placeholder="e.g. Weekly product sync"
          invalid={Boolean(titleError)}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date and time" htmlFor="meeting-started-at">
          <Input
            id="meeting-started-at"
            type="datetime-local"
            className="tnum"
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
          />
        </Field>
        <Field label="Channel" htmlFor="meeting-channel">
          <Select
            id="meeting-channel"
            options={channelOptions}
            value={channel}
            onValueChange={setChannel}
            disabled={channels.isPending}
          />
        </Field>
      </div>
      <Field label="Participants" htmlFor="meeting-participants">
        <ParticipantsInput
          id="meeting-participants"
          value={participants}
          onChange={setParticipants}
        />
      </Field>
      {error && <InlineError message={error} focusOnMount />}
      <div className="flex justify-end gap-2 pb-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
