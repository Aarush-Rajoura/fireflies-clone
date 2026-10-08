"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { toast } from "@/components/ui";
import { qk, type MeetingCreate } from "@/lib/api";

import { createMeeting } from "../api";
import { closeCreateMeeting } from "../lib/modal-store";

/**
 * Create, then land on the new meeting. Navigation happens once, here at the
 * hook level, so a caller cannot add a second push.
 */
export function useCreateMeeting() {
  const client = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (body: MeetingCreate) => createMeeting(body),
    // Shown inline in the modal, where the user can fix the input and resubmit.
    meta: { errorToast: false },
    onSuccess: (meeting) => {
      // Seeding the detail cache makes the meeting page render without a second fetch.
      client.setQueryData(qk.meetings.detail(meeting.id), meeting);
      // Not awaited: the lists refresh in the background while we navigate.
      void client.invalidateQueries({ queryKey: qk.meetings.lists() });
      // Creating a meeting writes a notification for the bell.
      void client.invalidateQueries({ queryKey: qk.notifications() });
      toast.success("Meeting created");
      closeCreateMeeting();
      router.push(`/meetings/${meeting.id}`);
    },
  });
}
