"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui";
import { ApiError, qk } from "@/lib/api";

import { createChannel, deleteChannel, renameChannel } from "../api";

export const CHANNEL_EXISTS = "CHANNEL_EXISTS";

/** A duplicate name is the user's to fix in the form, so it is shown inline, not as a toast. */
export function isDuplicateName(error: unknown): boolean {
  return error instanceof ApiError && error.code === CHANNEL_EXISTS;
}

/** Channel changes alter channel counts and, for rename/delete, the channel tag on meeting rows. */
function useInvalidate() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: qk.channels() }),
      client.invalidateQueries({ queryKey: qk.meetings.lists() }),
    ]);
}

export function useCreateChannel() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (name: string) => createChannel(name),
    meta: { silent: true },
    onSuccess: async (channel) => {
      toast.success(`Created #${channel.name}`);
      await invalidate();
    },
  });
}

export function useRenameChannel() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => renameChannel(id, name),
    meta: { silent: true },
    onSuccess: async () => {
      toast.success("Channel renamed");
      await invalidate();
    },
  });
}

export function useDeleteChannel() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => deleteChannel(id),
    onSuccess: async () => {
      toast.success("Channel deleted");
      await invalidate();
    },
  });
}
