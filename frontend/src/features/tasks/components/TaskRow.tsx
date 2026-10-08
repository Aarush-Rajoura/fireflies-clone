"use client";

import { Trash2, UserRound, Video } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import {
  Badge,
  Checkbox,
  DatePicker,
  IconButton,
  Input,
  TextButton,
  type BadgeTone,
} from "@/components/ui";
import { describeDueDate, type DueTone } from "@/features/action-items";
import type { ActionItem } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

import { useDeleteTask } from "../hooks/useDeleteTask";
import { useUpdateTask } from "../hooks/useUpdateTask";

const dueTones: Record<DueTone, BadgeTone> = {
  overdue: "danger",
  today: "warning",
  tomorrow: "accent",
  upcoming: "neutral",
};

// Row actions stay out of the way until the row is hovered or holds focus.
const revealOnHover =
  "opacity-0 transition-opacity duration-fast group-focus-within:opacity-100 group-hover:opacity-100";

export function assigneeName(item: ActionItem): string | null {
  return item.assignee?.display_name ?? item.assignee_user?.name ?? null;
}

export function TaskRow({ item }: { item: ActionItem }) {
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const [draft, setDraft] = useState<string | null>(null);
  // Set once Enter saved or Escape cancelled, so the blur that follows does nothing.
  const settled = useRef(false);
  const done = item.status === "completed";
  const due = describeDueDate(item.due_date);
  const who = assigneeName(item);

  const finishEdit = (save: boolean) => {
    if (settled.current) return;
    settled.current = true;
    const text = draft?.trim();
    setDraft(null);
    if (save && text && text !== item.text) update.mutate({ item, patch: { text } });
  };

  return (
    <li className="group flex items-start gap-3 rounded-item px-3 py-2.5 transition-colors duration-fast hover:bg-surface-hover">
      <Checkbox
        className="mt-[3px]"
        checked={done}
        aria-label={done ? `Mark "${item.text}" open` : `Mark "${item.text}" complete`}
        onCheckedChange={(checked) =>
          update.mutate({ item, patch: { status: checked ? "completed" : "open" } })
        }
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {draft !== null ? (
          <Input
            autoFocus
            aria-label="Task text"
            value={draft}
            maxLength={500}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => finishEdit(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                e.preventDefault();
                finishEdit(e.key === "Enter");
              }
            }}
            className="h-btn-sm"
          />
        ) : (
          <p className={cn("text-body", done ? "text-muted line-through" : "text-primary")}>
            <TextButton
              tone="plain"
              aria-label={`Edit "${item.text}"`}
              onClick={() => {
                settled.current = false;
                setDraft(item.text);
              }}
            >
              {item.text}
            </TextButton>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted">
          {due && !done && (
            <Badge tone={dueTones[due.tone]} className="normal-case">
              {due.label}
            </Badge>
          )}
          {who && (
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3.5" strokeWidth={1.75} aria-hidden />
              {who}
            </span>
          )}
          {item.meeting && (
            <Link
              href={`/meetings/${item.meeting.id}`}
              className="inline-flex min-w-0 items-center gap-1 rounded-tag text-secondary transition-colors duration-fast hover:text-accent"
            >
              <Video className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="truncate">from {item.meeting.title}</span>
            </Link>
          )}
        </div>
      </div>
      <div className={cn("flex items-center gap-1", revealOnHover)}>
        <DatePicker
          label={`Due date for "${item.text}"`}
          value={item.due_date ?? ""}
          onChange={(value) => update.mutate({ item, patch: { due_date: value || null } })}
          className="h-btn-sm text-meta"
        />
        <IconButton
          label={`Delete "${item.text}"`}
          size="sm"
          icon={<Trash2 strokeWidth={1.75} />}
          onClick={() => remove.mutate(item)}
        />
      </div>
    </li>
  );
}
