"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui";
import { ApiError, qk, type ActionItem, type ActionItemUpdate } from "@/lib/api";

import { updateActionItem } from "../api";
import { actionItemMutationScope, settleActionItems } from "../lib/settle";
import { replaceItem } from "../lib/cache";

export type AssigneeOption = { id: number; display_name: string };

export type UpdateActionItemVars = {
  id: number;
  patch: ActionItemUpdate;
  /** The picked participant, so the optimistic row shows the right name before the server answers. */
  assignee?: AssigneeOption | null;
};

/** The cached row as it will look once the patch lands. Pure, so it is testable. */
export function applyPatch(
  item: ActionItem,
  vars: UpdateActionItemVars,
  now = new Date(),
): ActionItem {
  const { patch } = vars;
  const next: ActionItem = { ...item };
  if (patch.text != null) next.text = patch.text;
  if (patch.due_date !== undefined) next.due_date = patch.due_date;
  if (patch.status != null) {
    next.status = patch.status;
    next.completed_at =
      patch.status === "completed" ? (item.completed_at ?? now.toISOString()) : null;
  }
  if (patch.assignee_participant_id !== undefined) {
    next.assignee =
      patch.assignee_participant_id === null
        ? null
        : (vars.assignee ??
          (item.assignee?.id === patch.assignee_participant_id ? item.assignee : null));
  }
  return next;
}

/** Undo only the fields this patch changed, so a concurrent edit to another field survives. */
export function revertPatch(
  current: ActionItem,
  before: ActionItem,
  patch: ActionItemUpdate,
): ActionItem {
  const next: ActionItem = { ...current };
  if (patch.text != null) next.text = before.text;
  if (patch.due_date !== undefined) next.due_date = before.due_date;
  if (patch.status != null) {
    next.status = before.status;
    next.completed_at = before.completed_at;
  }
  if (patch.assignee_participant_id !== undefined) next.assignee = before.assignee;
  return next;
}

function failureMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "ASSIGNEE_NOT_IN_MEETING") return "That person isn't in this meeting.";
    if (error.message) return error.message;
  }
  return "Couldn't save the action item.";
}

/**
 * Optimistic: the checkbox, text, assignee and date change instantly and roll
 * back if the server refuses. Its own error toast (not the global one) because
 * the rollback lives in this hook's callbacks.
 */
export function useUpdateActionItem(meetingId: number) {
  const client = useQueryClient();
  const key = qk.actionItems(meetingId);
  const mutation = useMutation({
    mutationKey: [...actionItemMutationScope(meetingId), "update"],
    mutationFn: ({ id, patch }: UpdateActionItemVars) => updateActionItem(id, patch),
    meta: { errorToast: false },
    onMutate: async (vars) => {
      await client.cancelQueries({ queryKey: key });
      const before = client.getQueryData<ActionItem[]>(key)?.find((x) => x.id === vars.id);
      client.setQueryData<ActionItem[]>(key, (old) =>
        old?.map((item) => (item.id === vars.id ? applyPatch(item, vars) : item)),
      );
      return { before };
    },
    onError: (error, vars, context) => {
      const before = context?.before;
      if (before) {
        client.setQueryData<ActionItem[]>(key, (old) =>
          old?.map((item) => (item.id === vars.id ? revertPatch(item, before, vars.patch) : item)),
        );
      }
      const retryable = error instanceof ApiError && error.isRetryable;
      toast.error(
        failureMessage(error),
        retryable ? { retry: () => mutation.mutate(vars) } : undefined,
      );
    },
    onSuccess: (saved) => {
      client.setQueryData<ActionItem[]>(key, (old) => replaceItem(old, saved));
    },
    onSettled: () => settleActionItems(client, meetingId),
  });
  return mutation;
}
