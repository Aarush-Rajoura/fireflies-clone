"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { qk, type ActionItem, type ActionItemCreate } from "@/lib/api";

import { createActionItem } from "../api";

/** Not optimistic: the new row needs its server id before it can be edited or deleted. */
export function useCreateActionItem(meetingId: number) {
  const client = useQueryClient();
  const key = qk.actionItems(meetingId);
  return useMutation({
    mutationFn: (body: ActionItemCreate) => createActionItem(meetingId, body),
    onSuccess: (item) => {
      client.setQueryData<ActionItem[]>(key, (old) => (old ? [...old, item] : [item]));
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });
}
