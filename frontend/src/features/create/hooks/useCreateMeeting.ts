"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { qk, type MeetingCreate, type MeetingDetail } from "@/lib/api";

import { createMeeting } from "../api";

/**
 * The one create-meeting mutation (paste/upload, Schedule and Capture all use it).
 * Callers own the success UX (toast, navigation); errors show inline in the form.
 */
export function useCreateMeeting({ onSuccess }: { onSuccess?: (m: MeetingDetail) => void } = {}) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: MeetingCreate) => createMeeting(body),
    meta: { errorToast: false },
    onSuccess: (meeting) => {
      // Seeding the detail cache makes the meeting page render without a second fetch.
      client.setQueryData(qk.meetings.detail(meeting.id), meeting);
      onSuccess?.(meeting);
    },
    // Lists, the bell, AI-extracted tasks and the Home feed all change when a meeting is created.
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: qk.meetings.lists() }),
        client.invalidateQueries({ queryKey: qk.notifications() }),
        client.invalidateQueries({ queryKey: qk.tasks.all }),
        client.invalidateQueries({ queryKey: qk.feed() }),
      ]),
  });
}
