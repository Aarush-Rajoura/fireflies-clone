"use client";

import { useState, type FormEvent } from "react";

import { Button, Field, Input, Modal, Select, toast } from "@/components/ui";
import { ApiError, type MeetingDetail } from "@/lib/api";

import { useChannels, useUsers } from "../hooks/useEditOptions";
import { useUpdateMeeting } from "../hooks/useUpdateMeeting";
import {
  MAX_TITLE_LENGTH,
  buildMeetingPatch,
  draftsFrom,
  validateEdit,
  type EditErrors,
  type ParticipantDraft,
} from "../lib/participants";
import { ParticipantsEditor } from "./ParticipantsEditor";

export type EditMode = "edit" | "move";

export type EditMeetingModalProps = {
  meeting: MeetingDetail;
  /** null = closed. "move" shows only the channel picker. */
  mode: EditMode | null;
  onClose: () => void;
};

const NO_CHANNEL = "none";

export function EditMeetingModal({ meeting, mode, onClose }: EditMeetingModalProps) {
  return (
    <Modal
      open={mode !== null}
      onOpenChange={(open) => !open && onClose()}
      title={mode === "move" ? "Move to channel" : "Edit meeting"}
      size="md"
    >
      {/* Mounted only while open, so every opening starts from the saved meeting. */}
      {mode && <EditForm meeting={meeting} mode={mode} onClose={onClose} />}
    </Modal>
  );
}

function EditForm({
  meeting,
  mode,
  onClose,
}: {
  meeting: MeetingDetail;
  mode: EditMode;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(meeting.title);
  const [participants, setParticipants] = useState<readonly ParticipantDraft[]>(() =>
    draftsFrom(meeting),
  );
  const [channelId, setChannelId] = useState<number | null>(meeting.channel?.id ?? null);
  // Client checks run on submit; each message clears as soon as its field is edited.
  const [errors, setErrors] = useState<EditErrors>({});
  const channels = useChannels();
  const users = useUsers(mode === "edit");
  const update = useUpdateMeeting(meeting.id);

  const form = { title, participants, channelId };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const invalid = validateEdit(form);
    setErrors(invalid);
    if (invalid.title || invalid.participants) return;
    const patch = buildMeetingPatch(meeting, form);
    if (Object.keys(patch).length === 0) return onClose();
    try {
      await update.mutateAsync(patch);
      toast.success(mode === "move" ? "Meeting moved" : "Meeting updated");
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.code === "PARTICIPANT_NAME_TAKEN") {
        setErrors({ participants: "Two participants can't share a name." });
      } else if (error instanceof ApiError && error.status === 422) {
        setErrors({ title: error.message });
      } else {
        toast.error(error instanceof ApiError ? error.message : "Couldn't save the meeting");
      }
    }
  };

  const channelOptions = [
    { value: NO_CHANNEL, label: "No channel" },
    ...(channels.data ?? []).map((c) => ({ value: String(c.id), label: `# ${c.name}` })),
  ];
  const suggestions = (users.data ?? []).map((u) => u.name);

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-4">
      {mode === "edit" && (
        <>
          <Field label="Title" htmlFor="meeting-title" error={errors.title}>
            <Input
              id="meeting-title"
              value={title}
              maxLength={MAX_TITLE_LENGTH + 50}
              invalid={Boolean(errors.title)}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrors((x) => ({ ...x, title: undefined }));
              }}
              autoFocus
            />
          </Field>
          <Field
            label="Participants"
            htmlFor="meeting-participants"
            hint="Type a name, or pick a teammate."
            error={errors.participants}
          >
            <ParticipantsEditor
              inputId="meeting-participants"
              value={participants}
              onChange={(next) => {
                setParticipants(next);
                setErrors((x) => ({ ...x, participants: undefined }));
              }}
              suggestions={suggestions}
              invalid={Boolean(errors.participants)}
            />
          </Field>
        </>
      )}
      <Field label="Channel" htmlFor="meeting-channel">
        <Select
          id="meeting-channel"
          options={channelOptions}
          value={channelId === null ? NO_CHANNEL : String(channelId)}
          onValueChange={(v) => setChannelId(v === NO_CHANNEL ? null : Number(v))}
          disabled={channels.isLoading}
        />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose} disabled={update.isPending}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={update.isPending}>
          {mode === "move" ? "Move" : "Save"}
        </Button>
      </div>
    </form>
  );
}
