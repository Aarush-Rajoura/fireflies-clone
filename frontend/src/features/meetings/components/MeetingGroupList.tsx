"use client";

import { useMemo } from "react";

import type { MeetingListItem } from "@/lib/api";

import { groupByDate } from "../lib/group-by-date";

import { MeetingRow, type MeetingRowProps } from "./MeetingRow";

export type MeetingGroupListProps = Omit<MeetingRowProps, "meeting"> & {
  meetings: readonly MeetingListItem[];
};

/** Rows under day headings ("Today", "Yesterday", "Mon, Oct 5"), in the order the API sorted them. */
export function MeetingGroupList({ meetings, timeZone, ...rowProps }: MeetingGroupListProps) {
  const groups = useMemo(
    () => groupByDate(meetings, (m) => m.started_at, new Date(), timeZone),
    [meetings, timeZone],
  );
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`day-${group.key}`}>
          <h2
            id={`day-${group.key}`}
            className="sticky top-0 z-[2] bg-surface-0 px-4 py-2 text-label text-muted"
          >
            {group.label}
          </h2>
          <ul className="flex flex-col">
            {group.items.map((meeting) => (
              <li key={meeting.id}>
                <MeetingRow meeting={meeting} timeZone={timeZone} {...rowProps} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
