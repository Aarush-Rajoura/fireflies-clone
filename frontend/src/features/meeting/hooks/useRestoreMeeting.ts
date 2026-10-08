"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui";
import { qk, type MeetingDetail } from "@/lib/api";

import { restoreMeeting } from "../api";

/** Puts the restored meeting in the cache and refreshes everything that hid it. */
export function applyRestored(client: QueryClient, meeting: MeetingDetail): void {
  client.setQueryData(qk.meetings.detail(meeting.id), meeting);
  void client.invalidateQueries({
    queryKey: qk.meetings.all,
    predicate: (q) => q.queryKey[1] !== meeting.id || q.queryKey.length > 2,
  });
  void client.invalidateQueries({ queryKey: qk.channels() });
  // Its action items return to the cross-meeting task list.
  void client.invalidateQueries({ queryKey: qk.tasks.all });
}

export function useRestoreMeeting(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => restoreMeeting(id),
    onSuccess: (meeting) => {
      applyRestored(client, meeting);
      toast.success("Meeting restored");
    },
  });
}
