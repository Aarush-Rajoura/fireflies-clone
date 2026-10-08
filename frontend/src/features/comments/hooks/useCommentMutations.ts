"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui";
import { qk, type CommentCreate, type MeetingComment, type User } from "@/lib/api";
import {
  reinsertAt,
  removeById,
  replaceById,
  settleList,
  tempId,
  updateById,
} from "@/lib/query/list-cache";

import { createComment, deleteComment, updateComment } from "../api";
import { commentFailureMessage } from "../lib/body";

const scope = (meetingId: number) => ["comments", meetingId] as const;

/** A placeholder shown while the server stores the comment; a negative id marks it as pending. */
export function pendingComment(
  meetingId: number,
  body: CommentCreate,
  me: User | undefined,
  now = new Date(),
): MeetingComment {
  const at = now.toISOString();
  return {
    id: tempId(),
    meeting_id: meetingId,
    segment_id: body.segment_id ?? null,
    author: me ? { id: me.id, name: me.name, avatar_url: me.avatar_url ?? null } : null,
    body: body.body.trim(),
    created_at: at,
    updated_at: at,
  };
}

export const isPending = (c: MeetingComment) => c.id < 0;

/**
 * Optimistic: the comment appears at once and is swapped for the stored one,
 * or removed with an error toast. `mutateAsync` rejects on failure so the
 * composer can keep the text for another try.
 */
export function useCreateComment(meetingId: number) {
  const client = useQueryClient();
  const key = qk.comments(meetingId);
  return useMutation({
    mutationKey: [...scope(meetingId), "create"],
    mutationFn: (body: CommentCreate) => createComment(meetingId, body),
    meta: { errorToast: false },
    onMutate: async (body) => {
      await client.cancelQueries({ queryKey: key });
      const placeholder = pendingComment(meetingId, body, client.getQueryData<User>(qk.me()));
      client.setQueryData<MeetingComment[]>(key, (old) => [...(old ?? []), placeholder]);
      return { placeholderId: placeholder.id };
    },
    onSuccess: (saved, _body, context) => {
      client.setQueryData<MeetingComment[]>(key, (old) =>
        replaceById(old, context.placeholderId, saved),
      );
    },
    onError: (error, _body, context) => {
      if (context) {
        client.setQueryData<MeetingComment[]>(key, (old) =>
          removeById(old, context.placeholderId),
        );
      }
      toast.error(commentFailureMessage(error, "Couldn't post the comment."));
    },
    onSettled: () => settleList(client, scope(meetingId), key),
  });
}

export type UpdateCommentVars = { id: number; body: string };

/** Optimistic edit; on failure only this comment's body is put back. */
export function useUpdateComment(meetingId: number) {
  const client = useQueryClient();
  const key = qk.comments(meetingId);
  return useMutation({
    mutationKey: [...scope(meetingId), "update"],
    mutationFn: ({ id, body }: UpdateCommentVars) => updateComment(id, { body }),
    meta: { errorToast: false },
    onMutate: async ({ id, body }) => {
      await client.cancelQueries({ queryKey: key });
      const before = client.getQueryData<MeetingComment[]>(key)?.find((c) => c.id === id);
      client.setQueryData<MeetingComment[]>(key, (old) =>
        updateById(old, id, (c) => ({ ...c, body: body.trim() })),
      );
      return { before };
    },
    onSuccess: (saved) => {
      client.setQueryData<MeetingComment[]>(key, (old) => replaceById(old, saved.id, saved));
    },
    onError: (error, { id }, context) => {
      const before = context?.before;
      if (before) {
        client.setQueryData<MeetingComment[]>(key, (old) =>
          updateById(old, id, (c) => ({ ...c, body: before.body })),
        );
      }
      toast.error(commentFailureMessage(error, "Couldn't save the comment."));
    },
    onSettled: () => settleList(client, scope(meetingId), key),
  });
}

/** Optimistic removal; on failure the comment returns to its place in the thread. */
export function useDeleteComment(meetingId: number) {
  const client = useQueryClient();
  const key = qk.comments(meetingId);
  return useMutation({
    mutationKey: [...scope(meetingId), "delete"],
    mutationFn: (id: number) => deleteComment(id),
    meta: { errorToast: false },
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: key });
      const list = client.getQueryData<MeetingComment[]>(key) ?? [];
      const index = list.findIndex((c) => c.id === id);
      client.setQueryData<MeetingComment[]>(key, (old) => removeById(old, id));
      return { removed: list[index], index };
    },
    onError: (error, _id, context) => {
      const removed = context?.removed;
      if (removed) {
        client.setQueryData<MeetingComment[]>(key, (old) =>
          reinsertAt(old, removed, context.index),
        );
      }
      toast.error(commentFailureMessage(error, "Couldn't delete the comment."));
    },
    onSuccess: () => toast.success("Comment deleted"),
    onSettled: () => settleList(client, scope(meetingId), key),
  });
}
