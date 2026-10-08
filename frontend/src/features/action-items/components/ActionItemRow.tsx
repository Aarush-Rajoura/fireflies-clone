"use client";

import { CalendarClock, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import {
  Badge,
  Checkbox,
  IconButton,
  Input,
  TextButton,
  TimestampButton,
  type BadgeTone,
} from "@/components/ui";
import { usePlayerControls } from "@/features/player";
import type { ActionItem } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

import { useDeleteActionItem } from "../hooks/useDeleteActionItem";
import { useUpdateActionItem, type AssigneeOption } from "../hooks/useUpdateActionItem";
import { describeDueDate, type DueTone } from "../lib/due-date";
import { ActionItemDetails } from "./ActionItemDetails";

const dueTones: Record<DueTone, BadgeTone> = {
  overdue: "danger",
  today: "warning",
  tomorrow: "accent",
  upcoming: "neutral",
};

// Row actions stay out of the way until the row is hovered or holds focus.
const revealOnHover =
  "opacity-0 transition-opacity duration-fast group-focus-within:opacity-100 group-hover:opacity-100";

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
  const [showDetails, setShowDetails] = useState(false);
  // Set once Enter saved or Escape cancelled, so the blur that follows does nothing.
  const settled = useRef(false);
  const done = item.status === "completed";
  const due = describeDueDate(item.due_date);

  const startEdit = () => {
    settled.current = false;
    setDraft(item.text);
  };
  const finishEdit = (save: boolean) => {
    if (settled.current) return;
    settled.current = true;
    const text = draft?.trim();
    setDraft(null);
    if (save && text && text !== item.text) update.mutate({ id: item.id, patch: { text } });
  };

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
            <TextButton tone="plain" onClick={startEdit} aria-label={`Edit "${item.text}"`}>
              {item.text}
            </TextButton>
            {item.start_ms !== null && (
              <>
                {" "}
                <TimestampButton ms={item.start_ms} onSeek={seek} />
              </>
            )}
            {due && !done && (
              <>
                {" "}
                <Badge tone={dueTones[due.tone]} className="normal-case align-middle">
                  {due.label}
                </Badge>
              </>
            )}
          </p>
        )}
        {showDetails && (
          <ActionItemDetails
            item={item}
            participants={participants}
            onChange={(patch, assignee) => update.mutate({ id: item.id, patch, assignee })}
          />
        )}
      </div>
      <div className={cn("flex items-center", !showDetails && revealOnHover)}>
        <IconButton
          label={showDetails ? "Hide assignee and due date" : "Set assignee and due date"}
          size="sm"
          active={showDetails}
          icon={<CalendarClock strokeWidth={1.75} />}
          onClick={() => setShowDetails((v) => !v)}
        />
        <IconButton
          label={`Delete "${item.text}"`}
          size="sm"
          icon={<Trash2 strokeWidth={1.75} />}
          onClick={() => remove.mutate(item.id)}
        />
      </div>
    </li>
  );
}
