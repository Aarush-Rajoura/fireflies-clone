"use client";

import { useState, type FormEvent } from "react";

import { Button, DatePicker, Field, Input, Modal, Select } from "@/components/ui";
import { useUsers } from "@/features/meeting";
import { useMeetings } from "@/features/meetings";
import { useMe } from "@/features/user";
import { ApiError } from "@/lib/api";

import { useCreateTask } from "../hooks/useCreateTask";

const NONE = "none";
const FORM_ID = "new-task-form";
const MAX_TEXT = 500;
// Enough recent meetings to pick from; older ones are reached from the meeting page.
const MEETING_PICKER_QUERY = { page_size: 100, sort: "-started_at" } as const;

export type NewTaskModalProps = { open: boolean; onOpenChange: (open: boolean) => void };

/** Mounted only while open, so every opening starts from a blank form. */
export function NewTaskModal({ open, onOpenChange }: NewTaskModalProps) {
  const create = useCreateTask();
  const change = (next: boolean) => {
    // A failed attempt's error must not greet the next opening.
    if (!next) create.reset();
    onOpenChange(next);
  };
  return (
    <Modal
      open={open}
      onOpenChange={change}
      title="New task"
      dismissible={!create.isPending}
      footer={
        <>
          <Button variant="ghost" onClick={() => change(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" loading={create.isPending}>
            Create task
          </Button>
        </>
      }
    >
      {open && <NewTaskForm create={create} onDone={() => change(false)} />}
    </Modal>
  );
}

function NewTaskForm({
  create,
  onDone,
}: {
  create: ReturnType<typeof useCreateTask>;
  onDone: () => void;
}) {
  const me = useMe();
  const users = useUsers();
  const meetings = useMeetings(MEETING_PICKER_QUERY);
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  // Undefined until touched, so it can default to "me" once /me has loaded.
  const [assignee, setAssignee] = useState<string | undefined>(undefined);
  const [meeting, setMeeting] = useState(NONE);
  const [touched, setTouched] = useState(false);

  const assigneeValue = assignee ?? (me.data ? String(me.data.id) : NONE);
  const textError = touched && text.trim() === "" ? "Describe the task." : undefined;
  const serverError =
    create.error instanceof ApiError
      ? create.error.message
      : create.error
        ? "Couldn't create the task."
        : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (text.trim() === "" || create.isPending) return;
    create.mutate(
      {
        text: text.trim(),
        due_date: due || null,
        assignee_user_id: assigneeValue === NONE ? null : Number(assigneeValue),
        meeting_id: meeting === NONE ? null : Number(meeting),
      },
      { onSuccess: onDone },
    );
  };

  const userOptions = [
    { value: NONE, label: "Unassigned" },
    ...(users.data ?? []).map((u) => ({
      value: String(u.id),
      label: u.id === me.data?.id ? `${u.name} (me)` : u.name,
    })),
  ];
  const meetingOptions = [
    { value: NONE, label: "No meeting" },
    ...(meetings.data?.items ?? []).map((m) => ({ value: String(m.id), label: m.title })),
  ];

  return (
    <form id={FORM_ID} onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="Task" htmlFor="task-text" error={textError}>
        <Input
          id="task-text"
          autoFocus
          value={text}
          maxLength={MAX_TEXT}
          placeholder="e.g. Send the revised proposal"
          invalid={Boolean(textError)}
          onChange={(e) => setText(e.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Due date" htmlFor="task-due">
          <DatePicker
            id="task-due"
            label="Due date"
            value={due}
            onChange={setDue}
            className="w-full"
          />
        </Field>
        <Field label="Assignee" htmlFor="task-assignee">
          <Select
            id="task-assignee"
            options={userOptions}
            value={assigneeValue}
            onValueChange={setAssignee}
            disabled={users.isPending}
          />
        </Field>
      </div>
      <Field label="Meeting" htmlFor="task-meeting" hint="Optional: link the task to a meeting.">
        <Select
          id="task-meeting"
          options={meetingOptions}
          value={meeting}
          onValueChange={setMeeting}
          disabled={meetings.isPending}
        />
      </Field>
      {serverError && (
        <p role="alert" className="text-caption text-danger-strong">
          {serverError}
        </p>
      )}
    </form>
  );
}
