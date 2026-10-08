"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui";
import { ApiError, qk, type ActionItem } from "@/lib/api";

import { deleteActionItem } from "../api";
import { reinsertItem, removeItem } from "../lib/cache";
import { actionItemMutationScope, settleActionItems } from "../lib/settle";

/**
 * Optimistic removal; on failure only this row comes back (other in-flight
 * edits are left alone). No undo: the server hard-deletes and re-creating
 * would lose the id and the AI source.
 */
export function useDeleteActionItem(meetingId: number) {
  const client = useQueryClient();
  const key = qk.actionItems(meetingId);
  return useMutation({
    mutationKey: [...actionItemMutationScope(meetingId), "delete"],
    mutationFn: (id: number) => deleteActionItem(id),
    meta: { errorToast: false },
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: key });
      const list = client.getQueryData<ActionItem[]>(key) ?? [];
      const index = list.findIndex((x) => x.id === id);
      client.setQueryData<ActionItem[]>(key, (old) => removeItem(old, id));
      return { removed: list[index], index };
    },
    onError: (error, _id, context) => {
      const removed = context?.removed;
      if (removed) {
        client.setQueryData<ActionItem[]>(key, (old) => reinsertItem(old, removed, context.index));
      }
      toast.error(
        error instanceof ApiError && error.message
          ? error.message
          : "Couldn't delete the action item.",
      );
    },
    onSuccess: () => toast.success("Action item deleted"),
    onSettled: () => settleActionItems(client, meetingId),
  });
}
