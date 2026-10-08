"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { toast } from "@/components/ui";
import { ApiError, qk, type MeetingDetail, type Tag } from "@/lib/api";

import { setMeetingTags } from "../api";

type Context = { previous?: MeetingDetail; optimistic?: Tag[] };

/** By ids: the cache copies arrays on write (structural sharing), so identity can't be used. */
const sameSet = (a: readonly Tag[] | undefined, b: readonly Tag[] | undefined) =>
  a !== undefined && b !== undefined && a.map((t) => t.id).join() === b.map((t) => t.id).join();

/**
 * A meeting's tag set, changed optimistically: the chips update at once and
 * roll back (with a toast) if the server refuses. `add`/`remove`/`toggle` read
 * the cache at call time, so a toggle fired right after another, or after an
 * awaited create, never works from a stale set.
 */
export function useSetMeetingTags(meetingId: number) {
  const client = useQueryClient();
  const key = qk.meetings.detail(meetingId);
  const mutationKey = [...key, "set-tags"];

  const mutation = useMutation<MeetingDetail, Error, Tag[], Context>({
    mutationKey,
    mutationFn: (tags) =>
      setMeetingTags(
        meetingId,
        tags.map((t) => t.id),
      ),
    meta: { errorToast: false },
    onMutate: async (tags) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<MeetingDetail>(key);
      if (previous) client.setQueryData<MeetingDetail>(key, { ...previous, tags });
      return { previous, optimistic: tags };
    },
    onError: (error, _tags, context) => {
      const current = client.getQueryData<MeetingDetail>(key);
      // Only undo our own change; if a later toggle has moved on, refetch the truth instead.
      if (context?.previous && sameSet(current?.tags, context.optimistic)) {
        client.setQueryData(key, context.previous);
      } else {
        void client.invalidateQueries({ queryKey: key });
      }
      toast.error(
        error instanceof ApiError && error.message ? error.message : "Couldn't update tags",
      );
    },
    onSuccess: (meeting) => {
      // This mutation still counts as pending here, so > 1 means a newer toggle is in
      // flight: keep its optimistic set rather than flicker back to this older one.
      const newerPending = client.isMutating({ mutationKey }) > 1;
      const current = client.getQueryData<MeetingDetail>(key);
      client.setQueryData(
        key,
        newerPending && current ? { ...meeting, tags: current.tags } : meeting,
      );
    },
    onSettled: () => {
      // Hub rows and tag filters show the tags too.
      void client.invalidateQueries({ queryKey: qk.meetings.lists() });
    },
  });

  const { mutate } = mutation;
  const currentTags = useCallback(
    () => client.getQueryData<MeetingDetail>(qk.meetings.detail(meetingId))?.tags ?? [],
    [client, meetingId],
  );

  const add = useCallback(
    (tag: Tag) => {
      const tags = currentTags();
      if (!tags.some((t) => t.id === tag.id)) mutate([...tags, tag]);
    },
    [currentTags, mutate],
  );
  const remove = useCallback(
    (tagId: number) => mutate(currentTags().filter((t) => t.id !== tagId)),
    [currentTags, mutate],
  );
  const toggle = useCallback(
    (tag: Tag) => (currentTags().some((t) => t.id === tag.id) ? remove(tag.id) : add(tag)),
    [add, currentTags, remove],
  );

  return { add, remove, toggle, isPending: mutation.isPending };
}
