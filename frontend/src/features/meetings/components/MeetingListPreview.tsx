"use client";

import Link from "next/link";

import { EmptyState, SkeletonCardsIllustration, StateView } from "@/components/ui";

import { useMeetings } from "../hooks/useMeetings";

/**
 * Interim meetings list: titles only, proving the typed client end to end
 * through the /api proxy. The full Notebook replaces it.
 */
export function MeetingListPreview() {
  const query = useMeetings();
  return (
    <section className="mx-auto w-full max-w-content px-6 py-8">
      <h2 className="mb-4 text-h2 text-strong">My Meetings</h2>
      <StateView
        query={query}
        isEmpty={(page) => page.items.length === 0}
        empty={
          <EmptyState
            illustration={<SkeletonCardsIllustration />}
            title="Looks like you haven't recorded a meeting yet"
            description="Once you record your first meeting with Fireflies, it'll show up right here."
          />
        }
      >
        {(page) => (
          <ul className="divide-y divide-subtle rounded-card border border-subtle bg-surface-1">
            {page.items.map((meeting) => (
              <li key={meeting.id}>
                <Link
                  href={`/meetings/${meeting.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-surface-hover"
                >
                  <span className="truncate text-title-row text-primary">{meeting.title}</span>
                  <span className="tnum shrink-0 text-meta text-muted">
                    {new Date(meeting.started_at).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </StateView>
    </section>
  );
}
