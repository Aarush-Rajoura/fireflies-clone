"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { qk, type Page, type Tag, type TagUpdate } from "@/lib/api";

import { createTag, deleteTag, listTags, updateTag } from "../api";
import { tagColorIndex } from "../lib/color";

const byName = (a: Tag, b: Tag) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

/** Every tag, sorted by name. */
export function useTags({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: qk.tags(),
    queryFn: ({ signal }) => listTags(signal),
    select: (page: Page<Tag>) => [...page.items].sort(byName),
    enabled,
  });
}

function upsertCached(client: QueryClient, tag: Tag) {
  client.setQueryData<Page<Tag>>(qk.tags(), (page) =>
    page ? { ...page, items: [...page.items.filter((t) => t.id !== tag.id), tag] } : page,
  );
}

/**
 * Create a tag; the caller handles 409 TAG_EXISTS (it means "use the existing
 * one"), so the global toast is off.
 */
export function useCreateTag() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createTag({ name, color_index: tagColorIndex(name) }),
    meta: { errorToast: false },
    onSuccess: (tag) => {
      upsertCached(client, tag);
      void client.invalidateQueries({ queryKey: qk.tags() });
    },
  });
}

/** Rename; the caller shows a name clash inline. Meetings embed tags, so they refresh too. */
export function useUpdateTag() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: TagUpdate }) => updateTag(id, patch),
    meta: { errorToast: false },
    onSuccess: (tag) => {
      upsertCached(client, tag);
      void client.invalidateQueries({ queryKey: qk.tags() });
      void client.invalidateQueries({ queryKey: qk.meetings.all });
    },
  });
}

/** Deleting a tag also takes it off every meeting, server side. */
export function useDeleteTag() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTag(id),
    onSuccess: (_void, id) => {
      client.setQueryData<Page<Tag>>(qk.tags(), (page) =>
        page ? { ...page, items: page.items.filter((t) => t.id !== id) } : page,
      );
      void client.invalidateQueries({ queryKey: qk.tags() });
      void client.invalidateQueries({ queryKey: qk.meetings.all });
    },
  });
}
