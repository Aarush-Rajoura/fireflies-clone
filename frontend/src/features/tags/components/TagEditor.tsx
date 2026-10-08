"use client";

import { Plus, Search } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";

import { Button, Checkbox, Chip, Input, Popover, Skeleton } from "@/components/ui";
import type { MeetingDetail, Tag } from "@/lib/api";

import { useApplyTagByName } from "../hooks/useApplyTagByName";
import { useSetMeetingTags } from "../hooks/useSetMeetingTags";
import { useTags } from "../hooks/useTags";
import { sameTagName } from "../lib/color";
import { TagChip } from "./TagChip";

export type TagEditorProps = {
  meeting: Pick<MeetingDetail, "id" | "tags" | "suggested_tags">;
};

/** "+ Tag": a popover to search, toggle and create tags, with the meeting's suggested keywords. */
export function TagEditor({ meeting }: TagEditorProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label="Edit tags"
      className="w-72 p-0"
      trigger={
        <Button
          variant="ghost"
          size="sm"
          leadingIcon={<Plus strokeWidth={1.75} />}
          className="h-[22px] px-1.5 text-caption"
        >
          Tag
        </Button>
      }
    >
      {/* Mounted only while open, so the tag list is fetched on first use. */}
      {open && <TagEditorPanel meeting={meeting} />}
    </Popover>
  );
}

function TagEditorPanel({ meeting }: TagEditorProps) {
  const idBase = useId();
  const [query, setQuery] = useState("");
  const tags = useTags();
  const { toggle } = useSetMeetingTags(meeting.id);
  const { apply, isCreating } = useApplyTagByName(meeting.id);

  const applied = new Set(meeting.tags.map((t) => t.id));
  const needle = query.trim();
  const all = tags.data ?? [];
  const shown = needle
    ? all.filter((t) => t.name.toLowerCase().includes(needle.toLowerCase()))
    : all;
  const exact = needle ? all.find((t) => sameTagName(t.name, needle)) : undefined;
  const suggestions = meeting.suggested_tags.filter(
    (s) => !meeting.tags.some((t) => sameTagName(t.name, s)),
  );

  const create = () => {
    void apply(needle);
    setQuery("");
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !needle) return;
    e.preventDefault();
    if (exact) toggle(exact);
    else create();
  };

  return (
    <div className="flex flex-col">
      <div className="border-b border-subtle p-2">
        <Input
          autoFocus
          aria-label="Search or create a tag"
          placeholder="Search or create a tag"
          leadingIcon={<Search strokeWidth={1.75} />}
          value={query}
          maxLength={50}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          className="h-btn-md"
        />
      </div>

      {!needle && suggestions.length > 0 && (
        <div className="flex flex-col gap-1.5 border-b border-subtle p-3">
          <span className="text-label text-muted">Suggested</span>
          <div role="group" aria-label="Suggested tags" className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <Chip
                key={s}
                icon={<Plus strokeWidth={1.75} />}
                aria-label={`Add suggested tag ${s}`}
                onClick={() => void apply(s)}
                className="h-7 px-2 text-meta [&_svg]:size-3.5"
              >
                {s}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div role="group" aria-label="Tags" className="flex max-h-56 flex-col overflow-y-auto p-1.5">
        {tags.isPending ? (
          <Skeleton className="m-1.5 h-6" />
        ) : shown.length === 0 ? (
          <p className="px-2 py-1.5 text-meta text-muted">
            {needle ? "No matching tags" : "No tags yet. Type a name to create one."}
          </p>
        ) : (
          shown.map((tag) => (
            <TagOption
              key={tag.id}
              id={`${idBase}-${tag.id}`}
              tag={tag}
              checked={applied.has(tag.id)}
              onToggle={() => toggle(tag)}
            />
          ))
        )}
      </div>

      {needle && !exact && (
        <div className="border-t border-subtle p-1.5">
          <Button
            variant="ghost"
            size="sm"
            loading={isCreating}
            leadingIcon={<Plus strokeWidth={1.75} />}
            onClick={create}
            className="w-full justify-start"
          >
            <span className="truncate">Create “{needle}”</span>
          </Button>
        </div>
      )}
    </div>
  );
}

function TagOption({
  id,
  tag,
  checked,
  onToggle,
}: {
  id: string;
  tag: Tag;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-item px-2 py-1.5 hover:bg-surface-hover">
      <Checkbox id={id} aria-label={tag.name} checked={checked} onCheckedChange={onToggle} />
      <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer">
        <TagChip tag={tag} />
      </label>
    </div>
  );
}
