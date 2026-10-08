"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { toast } from "@/components/ui";
import { ApiError, qk } from "@/lib/api";

import { deleteMeeting, restoreMeeting } from "../api";
import { applyRestored } from "./useRestoreMeeting";

/**
 * Soft delete, then leave the page with an Undo toast. The undo outlives this
 * component (we have navigated away), so it calls the API directly with the
 * query client captured here rather than through a mounted mutation.
 */
export function useDeleteMeeting(id: number) {
  const client = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => deleteMeeting(id),
    onSuccess: () => {
      router.push("/meetings");
      // Mark everything about this meeting stale without refetching now: the
      // page is still mounted until navigation lands, and a refetch would flash
      // the deleted state. The next visit refetches and gets the 410.
      void client.invalidateQueries({ queryKey: ["meetings", id], refetchType: "none" });
      void client.invalidateQueries({ queryKey: qk.meetings.lists() });
      void client.invalidateQueries({ queryKey: qk.channels() });
      // Its action items leave the cross-meeting task list.
      void client.invalidateQueries({ queryKey: qk.tasks.all });
      // The toast dismisses on click, but a fast double click can land twice.
      let restoring = false;
      toast.undo("Meeting deleted", () => {
        if (restoring) return;
        restoring = true;
        restoreMeeting(id)
          .then((meeting) => {
            applyRestored(client, meeting);
            toast.success("Meeting restored", {
              label: "View",
              onClick: () => router.push(`/meetings/${id}`),
            });
          })
          .catch((error: unknown) => {
            restoring = false;
            toast.error(error instanceof ApiError ? error.message : "Couldn't restore the meeting");
          });
      });
    },
  });
}
