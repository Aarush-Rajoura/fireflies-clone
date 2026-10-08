"use client";

import { Video } from "lucide-react";

import { EmptyState, StateView } from "@/components/ui";

import { useRecentMeetings } from "../hooks/useHomeMeetings";
import { formatHomeDate } from "../lib/format";

import { HomeRow } from "./HomeRow";

/** The five most recent finished meetings. */
export function RecentList({ timeZone }: { timeZone?: string }) {
  const query = useRecentMeetings();
  return (
    <StateView
      query={query}
      isEmpty={(page) => page.items.length === 0}
      empty={
        <EmptyState
          icon={<Video strokeWidth={1.75} />}
          title="No meetings yet"
          description="Capture a meeting or upload a recording and it will show up here."
        />
      }
    >
      {(page) => (
        <ul aria-label="Recent meetings" className="flex flex-col">
          {page.items.map((m) => (
            <HomeRow
              key={m.id}
              href={`/meetings/${m.id}`}
              title={m.title}
              meta={formatHomeDate(m.started_at, timeZone)}
            />
          ))}
        </ul>
      )}
    </StateView>
  );
}
