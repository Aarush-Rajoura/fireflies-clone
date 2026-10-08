"use client";

import type { MeetingDetail } from "@/lib/api";

import { TagChip } from "./TagChip";
import { TagEditor } from "./TagEditor";

export type MeetingTagsProps = {
  meeting: Pick<MeetingDetail, "id" | "tags" | "suggested_tags">;
};

/** The meeting header's tag row: its chips, then "+ Tag". */
export function MeetingTags({ meeting }: MeetingTagsProps) {
  return (
    <ul aria-label="Tags" className="flex min-w-0 flex-wrap items-center gap-1.5">
      {meeting.tags.map((tag) => (
        <li key={tag.id} className="flex">
          <TagChip tag={tag} />
        </li>
      ))}
      <li className="flex">
        <TagEditor meeting={meeting} />
      </li>
    </ul>
  );
}
