"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui";
import { ApiError, qk, type Soundbite, type SoundbiteCreate } from "@/lib/api";
import { reinsertAt, removeById, settleList } from "@/lib/query/list-cache";

import { createSoundbite, deleteSoundbite, fetchSoundbites } from "../api";

const scope = (meetingId: number) => ["soundbites", meetingId] as const;

export function useSoundbites(meetingId: number) {
  return useQuery({
    queryKey: qk.soundbites(meetingId),
    queryFn: ({ signal }) => fetchSoundbites(meetingId, signal),
  });
}

const byStart = (a: Soundbite, b: Soundbite) => a.start_ms - b.start_ms || a.id - b.id;

/**
 * Not optimistic: the server picks the default title and enforces the bounds.
 * Errors are left to the caller (the modal shows them inline and stays open).
 */
export function useCreateSoundbite(meetingId: number) {
  const client = useQueryClient();
  const key = qk.soundbites(meetingId);
  return useMutation({
    mutationFn: (body: SoundbiteCreate) => createSoundbite(meetingId, body),
    meta: { errorToast: false },
    onSuccess: (saved) => {
      client.setQueryData<Soundbite[]>(key, (old) => [...(old ?? []), saved].sort(byStart));
      toast.success("Soundbite created");
    },
    onSettled: () => settleList(client, scope(meetingId), key),
  });
}

/** Optimistic removal; on failure the clip returns to its place. */
export function useDeleteSoundbite(meetingId: number) {
  const client = useQueryClient();
  const key = qk.soundbites(meetingId);
  return useMutation({
    mutationKey: [...scope(meetingId), "delete"],
    mutationFn: (id: number) => deleteSoundbite(id),
    meta: { errorToast: false },
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: key });
      const list = client.getQueryData<Soundbite[]>(key) ?? [];
      const index = list.findIndex((s) => s.id === id);
      client.setQueryData<Soundbite[]>(key, (old) => removeById(old, id));
      return { removed: list[index], index };
    },
    onError: (error, _id, context) => {
      const removed = context?.removed;
      if (removed) {
        client.setQueryData<Soundbite[]>(key, (old) => reinsertAt(old, removed, context.index));
      }
      toast.error(
        error instanceof ApiError && error.message
          ? error.message
          : "Couldn't delete the soundbite.",
      );
    },
    onSuccess: () => toast.success("Soundbite deleted"),
    onSettled: () => settleList(client, scope(meetingId), key),
  });
}
