"use client";

import { CalendarClock, ExternalLink } from "lucide-react";

import { Badge, Button, EmptyState, StateView } from "@/components/ui";
import type { Platform } from "@/lib/api";

import { useUpcomingMeetings } from "../hooks/useHomeMeetings";
import { formatHomeDate } from "../lib/format";

import { HomeRow } from "./HomeRow";

const PLATFORM_LABEL: Record<Platform, string> = {
  zoom: "Zoom",
  meet: "Google Meet",
  teams: "Teams",
  other: "Web",
};

/** Scheduled meetings that have not started yet, soonest first. */
export function UpcomingList({
  onSchedule,
  timeZone,
}: {
  onSchedule: () => void;
  timeZone?: string;
}) {
  const query = useUpcomingMeetings();
  return (
    <StateView
      query={query}
      isEmpty={(page) => page.items.length === 0}
      empty={
        <EmptyState
          icon={<CalendarClock strokeWidth={1.75} />}
          title="No upcoming meetings"
          description="Connect a calendar or schedule a meeting and Fred will be ready to join."
          action={
            <Button variant="primary" onClick={onSchedule}>
              Schedule a meeting
            </Button>
          }
        />
      }
    >
      {(page) => (
        <ul aria-label="Upcoming meetings" className="flex flex-col">
          {page.items.map((m) => (
            <HomeRow
              key={m.id}
              href={`/meetings/${m.id}`}
              title={m.title}
              meta={formatHomeDate(m.started_at, timeZone)}
              trailing={
                <>
                  {m.platform && <Badge>{PLATFORM_LABEL[m.platform]}</Badge>}
                  {m.auto_join && <Badge tone="accent">Auto-join</Badge>}
                  {m.meeting_url && (
                    <a
                      href={m.meeting_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`Open the link for ${m.title}`}
                      className="flex size-btn-sm items-center justify-center rounded-control text-secondary hover:bg-surface-3 hover:text-primary"
                    >
                      <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden />
                    </a>
                  )}
                </>
              }
            />
          ))}
        </ul>
      )}
    </StateView>
  );
}
