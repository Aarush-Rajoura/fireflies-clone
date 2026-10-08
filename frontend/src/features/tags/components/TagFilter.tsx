"use client";

import { Chip, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

import { useTags } from "../hooks/useTags";
import { tagDotClass } from "../lib/color";

export type TagFilterProps = {
  /** Selected tag ids; a meeting matches if it has any of them. */
  value: readonly number[];
  onChange: (next: number[]) => void;
};

/** The Filters panel's "Tags" group: one toggle chip per tag. */
export function TagFilter({ value, onChange }: TagFilterProps) {
  const tags = useTags();
  const selected = new Set(value);

  const toggle = (id: number) =>
    onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-label text-secondary">Tags</legend>
      {tags.isPending ? (
        <Skeleton className="h-btn-sm w-2/3" />
      ) : !tags.data?.length ? (
        <p className="text-meta text-muted">No tags yet. Add one from a meeting.</p>
      ) : (
        <div
          role="group"
          aria-label="Tags"
          className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto"
        >
          {tags.data.map((tag) => (
            <Chip
              key={tag.id}
              selected={selected.has(tag.id)}
              onClick={() => toggle(tag.id)}
              className="h-btn-sm px-2.5 text-meta"
            >
              <span aria-hidden className={cn("size-2 rounded-full", tagDotClass(tag.name))} />
              {tag.name}
            </Chip>
          ))}
        </div>
      )}
    </fieldset>
  );
}
