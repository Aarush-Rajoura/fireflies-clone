"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui";
import { ApiError, qk, type Highlight, type HighlightColor, type HighlightCreate } from "@/lib/api";
import {
  reinsertAt,
  removeById,
  replaceById,
  settleList,
  tempId,
  updateById,
} from "@/lib/query/list-cache";

import { createHighlight, deleteHighlight, updateHighlight } from "../api";

const scope = (meetingId: number) => ["highlights", meetingId] as const;

function failureMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.code === "HIGHLIGHT_OUT_OF_RANGE") return "That text has changed; select it again.";
    if (error.code === "SEGMENT_NOT_IN_MEETING") return "That line isn't part of this meeting.";
    if (error.message) return error.message;
  }
  return fallback;
}

/** Optimistic: the colour appears under the selection at once, and is withdrawn if refused. */
export function useCreateHighlight(meetingId: number) {
  const client = useQueryClient();
  const key = qk.highlights(meetingId);
  return useMutation({
    mutationKey: [...scope(meetingId), "create"],
    mutationFn: (body: HighlightCreate) => createHighlight(meetingId, body),
    meta: { errorToast: false },
    onMutate: async (body) => {
      await client.cancelQueries({ queryKey: key });
      const placeholder: Highlight = {
        ...body,
        id: tempId(),
        meeting_id: meetingId,
        created_by: null,
      };
      client.setQueryData<Highlight[]>(key, (old) => [...(old ?? []), placeholder]);
      return { placeholderId: placeholder.id };
    },
    onSuccess: (saved, _body, context) => {
      client.setQueryData<Highlight[]>(key, (old) => replaceById(old, context.placeholderId, saved));
    },
    onError: (error, _body, context) => {
      if (context) {
        client.setQueryData<Highlight[]>(key, (old) => removeById(old, context.placeholderId));
      }
      toast.error(failureMessage(error, "Couldn't save the highlight."));
    },
    onSettled: () => settleList(client, scope(meetingId), key),
  });
}

export type RecolorVars = { id: number; color: HighlightColor };

export function useRecolorHighlight(meetingId: number) {
  const client = useQueryClient();
  const key = qk.highlights(meetingId);
  return useMutation({
    mutationKey: [...scope(meetingId), "update"],
    mutationFn: ({ id, color }: RecolorVars) => updateHighlight(id, { color }),
    meta: { errorToast: false },
    onMutate: async ({ id, color }) => {
      await client.cancelQueries({ queryKey: key });
      const before = client.getQueryData<Highlight[]>(key)?.find((h) => h.id === id)?.color;
      client.setQueryData<Highlight[]>(key, (old) => updateById(old, id, (h) => ({ ...h, color })));
      return { before };
    },
    onSuccess: (saved) => {
      client.setQueryData<Highlight[]>(key, (old) => replaceById(old, saved.id, saved));
    },
    onError: (error, { id }, context) => {
      const before = context?.before;
      if (before) {
        client.setQueryData<Highlight[]>(key, (old) =>
          updateById(old, id, (h) => ({ ...h, color: before })),
        );
      }
      toast.error(failureMessage(error, "Couldn't change the colour."));
    },
    onSettled: () => settleList(client, scope(meetingId), key),
  });
}

export function useDeleteHighlight(meetingId: number) {
  const client = useQueryClient();
  const key = qk.highlights(meetingId);
  return useMutation({
    mutationKey: [...scope(meetingId), "delete"],
    mutationFn: (id: number) => deleteHighlight(id),
    meta: { errorToast: false },
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: key });
      const list = client.getQueryData<Highlight[]>(key) ?? [];
      const index = list.findIndex((h) => h.id === id);
      client.setQueryData<Highlight[]>(key, (old) => removeById(old, id));
      return { removed: list[index], index };
    },
    onError: (error, _id, context) => {
      const removed = context?.removed;
      if (removed) {
        client.setQueryData<Highlight[]>(key, (old) => reinsertAt(old, removed, context.index));
      }
      toast.error(failureMessage(error, "Couldn't remove the highlight."));
    },
    onSettled: () => settleList(client, scope(meetingId), key),
  });
}
