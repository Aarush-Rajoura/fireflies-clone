"use client";

import { ListChecks } from "lucide-react";

import { EmptyState, StateView } from "@/components/ui";

import { useActionItems } from "../hooks/useActionItems";
import type { AssigneeOption } from "../hooks/useUpdateActionItem";
import { groupByAssignee } from "../lib/group";
import { ActionItemComposer } from "./ActionItemComposer";
import { ActionItemRow } from "./ActionItemRow";

export type ActionItemListProps = {
  meetingId: number;
  /** The meeting's participants (from the meeting detail), offered as assignees. */
  participants: readonly AssigneeOption[];
};

export function ActionItemList({ meetingId, participants }: ActionItemListProps) {
  const query = useActionItems(meetingId);
  return (
    <div className="flex flex-col gap-3">
      <StateView
        query={query}
        isEmpty={(items) => items.length === 0}
        errorMessage="We couldn't load the action items."
        empty={
          <EmptyState
            className="py-4"
            icon={<ListChecks strokeWidth={1.75} />}
            title="No action items"
            description="Add one below to track a follow-up from this meeting."
          />
        }
      >
        {(items) => (
          <div className="flex flex-col gap-4">
            {groupByAssignee(items).map((group) => (
              <section key={group.assigneeId ?? "none"} aria-label={group.name}>
                <h4 className="text-body-strong text-secondary">
                  {group.name}{" "}
                  <span className="tnum text-caption text-muted">({group.items.length})</span>
                </h4>
                <ul>
                  {group.items.map((item) => (
                    <ActionItemRow
                      key={item.id}
                      meetingId={meetingId}
                      item={item}
                      participants={participants}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </StateView>
      <ActionItemComposer meetingId={meetingId} participants={participants} />
    </div>
  );
}
