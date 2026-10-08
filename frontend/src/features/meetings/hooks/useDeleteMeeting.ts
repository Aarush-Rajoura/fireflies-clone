"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";

import { toast } from "@/components/ui";
import { qk, type MeetingListItem, type Page } from "@/lib/api";

import { deleteMeeting } from "../api";

import { useRestoreMeeting } from "./useRestoreMeeting";

type Snapshot = [QueryKey, Page<MeetingListItem> | undefined][];

function withoutMeeting(page: Page<MeetingListItem> | undefined, id: number) {
  if (!page || !page.items.some((m) => m.id === id)) return page;
  const total = Math.max(0, page.total - 1);
  const totalPages = Math.ceil(total / page.page_size);
  return {
    ...page,
    items: page.items.filter((m) => m.id !== id),
    total,
    total_pages: totalPages,
    has_next: page.page < totalPages,
  };
}

/**
 * Deletes at once and offers Undo rather than asking "are you sure?" first:
 * the delete is soft, so restoring is lossless and the user learns by seeing.
 * The row leaves every cached list immediately and comes back on failure.
 */
export function useDeleteMeeting() {
  const client = useQueryClient();
  const restore = useRestoreMeeting();

  return useMutation({
    mutationFn: (id: number) => deleteMeeting(id),
    onMutate: async (id): Promise<{ snapshot: Snapshot }> => {
      await client.cancelQueries({ queryKey: qk.meetings.lists() });
      const snapshot = client.getQueriesData<Page<MeetingListItem>>({
        queryKey: qk.meetings.lists(),
      });
      client.setQueriesData<Page<MeetingListItem>>({ queryKey: qk.meetings.lists() }, (page) =>
        withoutMeeting(page, id),
      );
      return { snapshot };
    },
    onError: (_error, _id, context) => {
      context?.snapshot.forEach(([key, data]) => client.setQueryData(key, data));
    },
    onSuccess: (_data, id) => {
      toast.undo("Meeting deleted", () => restore.mutate(id));
    },
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: qk.meetings.lists() }),
        client.invalidateQueries({ queryKey: qk.channels() }),
      ]),
  });
}
