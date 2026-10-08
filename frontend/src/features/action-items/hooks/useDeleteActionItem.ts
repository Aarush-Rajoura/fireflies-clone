"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui";
import { ApiError, qk, type ActionItem } from "@/lib/api";

import { deleteActionItem } from "../api";

/**
 * Optimistic removal with rollback on failure. No undo: the server hard-deletes
 * and re-creating would lose the id and the AI source, so the row just goes.
 */
export function useDeleteActionItem(meetingId: number) {
  const client = useQueryClient();
  const key = qk.actionItems(meetingId);
  return useMutation({
    mutationFn: (id: number) => deleteActionItem(id),
    meta: { errorToast: false },
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<ActionItem[]>(key);
      client.setQueryData<ActionItem[]>(key, (old) => old?.filter((item) => item.id !== id));
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
      toast.error(
        error instanceof ApiError && error.message
          ? error.message
          : "Couldn't delete the action item.",
      );
    },
    onSuccess: () => toast.success("Action item deleted"),
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });
}
