"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, Field, Input, Modal, Select, toast } from "@/components/ui";
import { ApiError } from "@/lib/api";

import { useCreateMeeting } from "../hooks/useCreateMeeting";
import {
  LANGUAGES,
  captureBody,
  validateCapture,
  type CaptureForm,
  type FormErrors,
} from "../lib/meeting-forms";

export type CaptureModalProps = { open: boolean; onOpenChange: (open: boolean) => void };

const EMPTY: CaptureForm = { title: "", meetingUrl: "", language: "en" };
const LANGUAGE_OPTIONS = LANGUAGES.map((l) => ({ value: l.value, label: l.label }));

/** "Capture Meeting": send Fred to a live call (simulated), then open the meeting page. */
export function CaptureModal({ open, onOpenChange }: CaptureModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Fred to a live meeting"
      description="Fred joins your Zoom, Google Meet or Teams call and takes notes for you."
    >
      {open && <CaptureBody onDone={() => onOpenChange(false)} />}
    </Modal>
  );
}

function CaptureBody({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState<CaptureForm>(EMPTY);
  const [errors, setErrors] = useState<FormErrors<CaptureForm>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const create = useCreateMeeting({
    onSuccess: (meeting) => {
      toast.info("Capture started (demo) — opening the meeting");
      onDone();
      router.push(`/meetings/${meeting.id}`);
    },
  });

  const set = <K extends keyof CaptureForm>(key: K, value: CaptureForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const found = validateCapture(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    create.mutate(captureBody(form), {
      onError: (error) =>
        setFormError(error instanceof ApiError ? error.message : "Couldn't add Fred. Try again."),
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 pb-2">
      <Field label="Meeting name" htmlFor="capture-title" error={errors.title}>
        <Input
          id="capture-title"
          value={form.title}
          invalid={!!errors.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Customer call"
          maxLength={300}
          autoFocus
        />
      </Field>
      <Field label="Meeting link" htmlFor="capture-link" error={errors.meetingUrl}>
        <Input
          id="capture-link"
          type="url"
          inputMode="url"
          value={form.meetingUrl}
          invalid={!!errors.meetingUrl}
          onChange={(e) => set("meetingUrl", e.target.value)}
          placeholder="https://zoom.us/j/…"
        />
      </Field>
      <Field label="Meeting language" htmlFor="capture-language">
        <Select
          id="capture-language"
          options={LANGUAGE_OPTIONS}
          value={form.language}
          onValueChange={(v) => set("language", v)}
        />
      </Field>
      <p className="text-caption text-muted">
        Demo: no bot really joins. The meeting is created as live so you can follow the flow.
      </p>
      {formError && (
        <p role="alert" className="text-caption text-danger-strong">
          {formError}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary" loading={create.isPending}>
          Add to meeting
        </Button>
      </div>
    </form>
  );
}
