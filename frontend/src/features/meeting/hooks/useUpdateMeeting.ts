"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { qk, type MeetingDetail, type MeetingUpdate } from "@/lib/api";

import { patchMeeting } from "../api";

/**
 * PATCH the meeting. The caller reports failures (the edit modal shows a name
 * clash inline), so the global toast is off.
 */
export function useUpdateMeeting(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: MeetingUpdate) => patchMeeting(id, body),
    meta: { errorToast: false },
    onSuccess: (meeting: MeetingDetail, body) => {
      client.setQueryData(qk.meetings.detail(id), meeting);
      void client.invalidateQueries({ queryKey: qk.meetings.lists() });
      // Participant changes flow into speaker names and assignee options.
      if (body.participants) {
        void client.invalidateQueries({ queryKey: qk.transcript(id) });
        void client.invalidateQueries({ queryKey: qk.actionItems(id) });
      }
      // Channel meeting counts.
      if ("channel_id" in body) void client.invalidateQueries({ queryKey: qk.channels() });
    },
  });
}
