"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { qk, type Transcript } from "@/lib/api";

import { renameSpeaker } from "../api";

type Vars = { speakerId: number; name: string };

/**
 * Renames a speaker everywhere in the transcript at once (optimistic), rolling
 * back if the server refuses. Failures surface through the global mutation
 * toast; its Retry re-runs these hook-level callbacks, so rollback still works.
 */
export function useRenameSpeaker(meetingId: number) {
  const client = useQueryClient();
  const key = qk.transcript(meetingId);

  return useMutation({
    mutationFn: ({ speakerId, name }: Vars) => renameSpeaker(speakerId, name),
    onMutate: async ({ speakerId, name }) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<Transcript>(key);
      if (previous) {
        client.setQueryData<Transcript>(key, {
          ...previous,
          // Only the renamed speaker gets a new object, so only its rows re-render.
          speakers: previous.speakers.map((s) => (s.id === speakerId ? { ...s, name } : s)),
        });
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: key });
      // Attendee names on the meeting header may follow the speaker.
      void client.invalidateQueries({ queryKey: qk.meetings.detail(meetingId), exact: true });
    },
  });
}
