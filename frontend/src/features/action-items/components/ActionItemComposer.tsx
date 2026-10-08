"use client";

import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button, Input, Select } from "@/components/ui";

import { useCreateActionItem } from "../hooks/useCreateActionItem";
import type { AssigneeOption } from "../hooks/useUpdateActionItem";

const NOBODY = "unassigned";

export function ActionItemComposer({
  meetingId,
  participants,
}: {
  meetingId: number;
  participants: readonly AssigneeOption[];
}) {
  const create = useCreateActionItem(meetingId);
  const [text, setText] = useState("");
  const [assignee, setAssignee] = useState(NOBODY);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    create.mutate(
      { text: value, assignee_participant_id: assignee === NOBODY ? null : Number(assignee) },
      // Clear only once saved, so a failed add keeps what was typed.
      { onSuccess: () => setText("") },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2 pt-2">
      <div className="min-w-48 flex-1">
        <Input
          aria-label="New action item"
          placeholder="Add an action item…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setText("")}
          className="h-btn-sm"
          maxLength={1000}
        />
      </div>
      <Select
        size="sm"
        label="Assign new action item to"
        className="w-36"
        value={assignee}
        onValueChange={setAssignee}
        options={[
          { value: NOBODY, label: "Unassigned" },
          ...participants.map((p) => ({ value: String(p.id), label: p.display_name })),
        ]}
      />
      <Button
        type="submit"
        size="sm"
        variant="secondary"
        leadingIcon={<Plus strokeWidth={1.75} />}
        loading={create.isPending}
        disabled={!text.trim()}
      >
        Add
      </Button>
    </form>
  );
}
