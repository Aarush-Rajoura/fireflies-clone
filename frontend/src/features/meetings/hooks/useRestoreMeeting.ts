"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui";
import { qk } from "@/lib/api";

import { restoreMeeting } from "../api";

/**
 * Callbacks live on the mutation options, not on `mutate()`: an undo can fire
 * after the row that raised it is gone, and only option callbacks still run.
 */
export function useRestoreMeeting() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => restoreMeeting(id),
    onSuccess: async () => {
      toast.success("Meeting restored");
      await Promise.all([
        client.invalidateQueries({ queryKey: qk.meetings.all }),
        client.invalidateQueries({ queryKey: qk.channels() }),
      ]);
    },
  });
}
