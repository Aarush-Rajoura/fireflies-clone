"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { qk, type TaskCreate } from "@/lib/api";

import { createTask } from "../api";

/**
 * Not optimistic: the new row needs its server id before it can be edited,
 * and only the server knows which filtered lists it belongs to.
 */
export function useCreateTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: TaskCreate) => createTask(body),
    meta: { errorToast: false },
    onSuccess: (item) => {
      if (item.meeting_id)
        void client.invalidateQueries({ queryKey: qk.actionItems(item.meeting_id) });
      return client.invalidateQueries({ queryKey: qk.tasks.all });
    },
  });
}
