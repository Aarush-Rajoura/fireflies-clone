"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui";
import { applyPatch, replaceItem, revertPatch } from "@/features/action-items";
import { ApiError, qk, type ActionItem, type ActionItemUpdate } from "@/lib/api";

import { updateTask } from "../api";

/** Prefix shared by every optimistic task mutation, so refetches wait for the last one. */
export const TASK_MUTATION_SCOPE = ["tasks", "mutation"] as const;

type Lists = ActionItem[] | undefined;

/** Refetch once the LAST optimistic edit settles, so an in-flight one doesn't flash away. */
export function settleTasks(client: QueryClient, item?: Pick<ActionItem, "meeting_id">) {
  if (client.isMutating({ mutationKey: TASK_MUTATION_SCOPE }) > 1) return;
  // The meeting page shows the same row; keep it in step.
  if (item?.meeting_id)
    void client.invalidateQueries({ queryKey: qk.actionItems(item.meeting_id) });
  return client.invalidateQueries({ queryKey: qk.tasks.all });
}

export type UpdateTaskVars = { item: ActionItem; patch: ActionItemUpdate };

/**
 * Optimistic across every cached task list (My/All, each filter): the row
 * changes at once and only the fields this patch touched roll back on failure.
 */
export function useUpdateTask() {
  const client = useQueryClient();
  const lists = { queryKey: qk.tasks.lists() };
  const mutation = useMutation({
    mutationKey: [...TASK_MUTATION_SCOPE, "update"],
    mutationFn: ({ item, patch }: UpdateTaskVars) => updateTask(item.id, patch),
    meta: { errorToast: false },
    onMutate: async ({ item, patch }) => {
      await client.cancelQueries(lists);
      client.setQueriesData<ActionItem[]>(lists, (old: Lists) =>
        old?.map((x) => (x.id === item.id ? applyPatch(x, { id: item.id, patch }) : x)),
      );
    },
    onError: (error, vars) => {
      client.setQueriesData<ActionItem[]>(lists, (old: Lists) =>
        old?.map((x) => (x.id === vars.item.id ? revertPatch(x, vars.item, vars.patch) : x)),
      );
      const retryable = error instanceof ApiError && error.isRetryable;
      toast.error(
        error instanceof ApiError && error.message ? error.message : "Couldn't save the task.",
        retryable ? { retry: () => mutation.mutate(vars) } : undefined,
      );
    },
    onSuccess: (saved) => {
      client.setQueriesData<ActionItem[]>(lists, (old: Lists) => replaceItem(old, saved));
    },
    onSettled: (_saved, _error, vars) => settleTasks(client, vars.item),
  });
  return mutation;
}
