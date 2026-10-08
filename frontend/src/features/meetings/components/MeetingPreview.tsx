"use client";

import { ComingSoon, StateView } from "@/components/ui";

import { useMeeting } from "../hooks/useMeetings";

/** Interim meeting page: the title from the API, until the player module lands. */
export function MeetingPreview({ id }: { id: number }) {
  const query = useMeeting(id);
  return (
    <section className="mx-auto w-full max-w-content px-6 py-8">
      <StateView
        query={query}
        isEmpty={() => false}
        empty={null}
        errorMessage="This meeting couldn't be loaded."
      >
        {(meeting) => (
          <div className="flex flex-col gap-6">
            <h2 className="text-h2 text-strong">{meeting.title}</h2>
            <ComingSoon
              title="Meeting player"
              message="Transcript, summary and playback will appear here."
            />
          </div>
        )}
      </StateView>
    </section>
  );
}
