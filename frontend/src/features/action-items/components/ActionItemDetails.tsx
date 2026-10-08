"use client";

import { useRef, useState } from "react";

import { DatePicker, Select } from "@/components/ui";
import type { ActionItem, ActionItemUpdate } from "@/lib/api";

import type { AssigneeOption } from "../hooks/useUpdateActionItem";
import { assigneeOptions, isCompleteDate, NOBODY } from "../lib/fields";

export type ActionItemDetailsProps = {
  item: ActionItem;
  participants: readonly AssigneeOption[];
  onChange: (patch: ActionItemUpdate, assignee?: AssigneeOption | null) => void;
};

/** Assignee and due-date editors, revealed on demand to keep rows light. */
export function ActionItemDetails({ item, participants, onChange }: ActionItemDetailsProps) {
  const dateRef = useRef<HTMLInputElement>(null);
  const saved = item.due_date ?? "";
  const [draft, setDraft] = useState<string | null>(null);
  const date = draft ?? saved;

  // A native date input reports every keystroke; save once, on blur or Enter.
  const commitDate = () => {
    if (draft === null) return;
    setDraft(null);
    // "" with badInput is a half-typed date, not a request to clear it.
    if (dateRef.current?.validity.badInput) return;
    if (draft === saved) return;
    if (draft === "") onChange({ due_date: null });
    else if (isCompleteDate(draft)) onChange({ due_date: draft });
  };

  const options = assigneeOptions(participants, item.assignee);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        size="sm"
        label="Assignee"
        className="w-40"
        options={options}
        value={item.assignee ? String(item.assignee.id) : NOBODY}
        onValueChange={(value) => {
          const id = value === NOBODY ? null : Number(value);
          const picked = options.find((o) => o.value === value);
          onChange(
            { assignee_participant_id: id },
            id === null || !picked ? null : { id, display_name: picked.label },
          );
        }}
      />
      {/* Focus events bubble in React, so the wrapper sees the picker's blur and Enter. */}
      <span
        onBlur={commitDate}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitDate();
          }
        }}
      >
        <DatePicker
          ref={dateRef}
          label="Due date"
          className="h-btn-sm px-2 text-caption"
          value={date}
          onChange={setDraft}
        />
      </span>
    </div>
  );
}
