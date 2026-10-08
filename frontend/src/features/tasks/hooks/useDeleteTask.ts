"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui";
import { reinsertItem, removeItem } from "@/features/action-items";
import { ApiError, qk, type ActionItem } from "@/lib/api";

import { deleteTask } from "../api";

import { TASK_MUTATION_SCOPE, settleTasks } from "./useUpdateTask";

type Removed = { key: readonly unknown[]; index: number };

/** Optimistic removal from every cached list; on failure the row returns where it was. */
export function useDeleteTask() {
  const client = useQueryClient();
  const lists = { queryKey: qk.tasks.lists() };
  return useMutation({
    mutationKey: [...TASK_MUTATION_SCOPE, "delete"],
    mutationFn: (item: ActionItem) => deleteTask(item.id),
    meta: { errorToast: false },
    onMutate: async (item) => {
      await client.cancelQueries(lists);
      const removed: Removed[] = [];
      for (const [key, list] of client.getQueriesData<ActionItem[]>(lists)) {
        const index = list?.findIndex((x) => x.id === item.id) ?? -1;
        if (index >= 0) removed.push({ key, index });
      }
      client.setQueriesData<ActionItem[]>(lists, (old: ActionItem[] | undefined) =>
        removeItem(old, item.id),
      );
      return { removed };
    },
    onError: (error, item, context) => {
      for (const { key, index } of context?.removed ?? []) {
        client.setQueryData<ActionItem[]>(key, (old) => reinsertItem(old, item, index));
      }
      toast.error(
        error instanceof ApiError && error.message ? error.message : "Couldn't delete the task.",
      );
    },
    onSuccess: () => toast.success("Task deleted"),
    onSettled: (_r, _e, item) => settleTasks(client, item),
  });
}
