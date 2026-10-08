"use client";

import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import {
  Badge,
  Checkbox,
  DatePicker,
  IconButton,
  Input,
  Select,
  type BadgeTone,
} from "@/components/ui";
import { formatClock, usePlayerControls } from "@/features/player";
import type { ActionItem } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

import { useDeleteActionItem } from "../hooks/useDeleteActionItem";
import { useUpdateActionItem, type AssigneeOption } from "../hooks/useUpdateActionItem";
import { describeDueDate, type DueTone } from "../lib/due-date";

const NOBODY = "unassigned"; // Radix Select forbids an empty-string value.

const dueTones: Record<DueTone, BadgeTone> = {
  overdue: "danger",
  today: "warning",
  tomorrow: "accent",
  upcoming: "neutral",
};

export type ActionItemRowProps = {
  meetingId: number;
  item: ActionItem;
  participants: readonly AssigneeOption[];
};

export function ActionItemRow({ meetingId, item, participants }: ActionItemRowProps) {
  const update = useUpdateActionItem(meetingId);
  const remove = useDeleteActionItem(meetingId);
  const { seek } = usePlayerControls();
  const [draft, setDraft] = useState<string | null>(null);
  // Escape unmounts the input, and browsers may still fire blur on the way out; this stops that saving.
  const cancelled = useRef(false);
  const done = item.status === "completed";
  const due = describeDueDate(item.due_date);

  const saveText = () => {
    if (cancelled.current) return;
    const text = draft?.trim();
    setDraft(null);
    if (text && text !== item.text) update.mutate({ id: item.id, patch: { text } });
  };

  const assigneeOptions = [
    { value: NOBODY, label: "Unassigned" },
    ...participants.map((p) => ({ value: String(p.id), label: p.display_name })),
  ];

  return (
    <li className="group flex items-start gap-2.5 py-1.5">
      <Checkbox
        className="mt-[3px]"
        checked={done}
        aria-label={done ? `Mark "${item.text}" open` : `Mark "${item.text}" complete`}
        onCheckedChange={(checked) =>
          update.mutate({ id: item.id, patch: { status: checked ? "completed" : "open" } })
        }
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {draft !== null ? (
          <Input
            autoFocus
            aria-label="Action item text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={saveText}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveText();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelled.current = true;
                setDraft(null);
              }
            }}
            className="h-btn-sm"
          />
        ) : (
          <p className={cn("text-body", done ? "text-muted line-through" : "text-primary")}>
            <button
              type="button"
              onClick={() => {
                cancelled.current = false;
                setDraft(item.text);
              }}
              className="rounded-tag text-left hover:bg-surface-hover"
              aria-label={`Edit "${item.text}"`}
            >
              {item.text}
            </button>
            {item.start_ms !== null && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => seek(item.start_ms ?? 0)}
                  aria-label={`Jump to ${formatClock(item.start_ms)}`}
                  className="tnum rounded-tag text-accent hover:underline"
                >
                  {formatClock(item.start_ms)}
                </button>
              </>
            )}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            size="sm"
            label="Assignee"
            className="w-40"
            options={assigneeOptions}
            value={item.assignee ? String(item.assignee.id) : NOBODY}
            onValueChange={(value) => {
              const id = value === NOBODY ? null : Number(value);
              update.mutate({
                id: item.id,
                patch: { assignee_participant_id: id },
                assignee: participants.find((p) => p.id === id) ?? null,
              });
            }}
          />
          <DatePicker
            label="Due date"
            className="h-btn-sm px-2 text-caption"
            value={item.due_date ?? ""}
            onChange={(value) => update.mutate({ id: item.id, patch: { due_date: value || null } })}
          />
          {due && !done && (
            <Badge tone={dueTones[due.tone]} className="normal-case">
              {due.label}
            </Badge>
          )}
        </div>
      </div>
      <IconButton
        label="Delete action item"
        size="sm"
        className="opacity-60 group-hover:opacity-100"
        icon={<Trash2 strokeWidth={1.75} />}
        onClick={() => remove.mutate(item.id)}
      />
    </li>
  );
}
