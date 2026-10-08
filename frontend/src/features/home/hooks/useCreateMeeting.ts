"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { qk, type MeetingCreate, type MeetingDetail } from "@/lib/api";

import { createMeeting } from "../api";

/**
 * Schedule (status "scheduled") or Capture (status "live"). Callers own the
 * success UX (toast, navigation); errors surface in the form, not a toast.
 */
export function useCreateMeeting({ onSuccess }: { onSuccess?: (m: MeetingDetail) => void } = {}) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: MeetingCreate) => createMeeting(body),
    onSuccess: (meeting) => {
      client.setQueryData(qk.meetings.detail(meeting.id), meeting);
      onSuccess?.(meeting);
    },
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: qk.meetings.lists() }),
        client.invalidateQueries({ queryKey: qk.notifications() }),
      ]),
  });
}
