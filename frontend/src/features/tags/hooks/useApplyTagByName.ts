"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { toast } from "@/components/ui";
import { ApiError, qk, type Page, type Tag } from "@/lib/api";

import { sameTagName } from "../lib/color";
import { useCreateTag } from "./useTags";
import { useSetMeetingTags } from "./useSetMeetingTags";

const TAG_EXISTS = "TAG_EXISTS";

/**
 * "Put a tag called X on this meeting": reuses a tag with that name (ignoring
 * case) or creates it first. A 409 means someone else created it meanwhile,
 * so the list is refetched and the existing tag applied instead.
 */
export function useApplyTagByName(meetingId: number) {
  const client = useQueryClient();
  const create = useCreateTag();
  const { add } = useSetMeetingTags(meetingId);
  const { mutateAsync } = create;

  const findCached = useCallback(
    (name: string) =>
      client.getQueryData<Page<Tag>>(qk.tags())?.items.find((t) => sameTagName(t.name, name)),
    [client],
  );

  const apply = useCallback(
    async (rawName: string) => {
      const name = rawName.trim();
      if (!name) return;
      const existing = findCached(name);
      if (existing) return add(existing);
      try {
        add(await mutateAsync(name));
      } catch (error) {
        if (error instanceof ApiError && error.code === TAG_EXISTS) {
          await client.refetchQueries({ queryKey: qk.tags() });
          const found = findCached(name);
          if (found) return add(found);
        }
        toast.error(
          error instanceof ApiError && error.message ? error.message : "Couldn't create the tag",
        );
      }
    },
    [add, client, findCached, mutateAsync],
  );

  return { apply, isCreating: create.isPending };
}
