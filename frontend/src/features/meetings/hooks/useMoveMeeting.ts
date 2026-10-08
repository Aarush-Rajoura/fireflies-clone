"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui";
import { qk } from "@/lib/api";

import { moveMeetingToChannel } from "../api";

export type MoveMeetingInput = { id: number; channelId: number | null; channelName?: string };

/** Files a meeting under a channel (or none); list membership and channel counts both change. */
export function useMoveMeeting() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, channelId }: MoveMeetingInput) => moveMeetingToChannel(id, channelId),
    onSuccess: async (_data, { channelName }) => {
      toast.success(channelName ? `Moved to #${channelName}` : "Removed from channel");
      await Promise.all([
        client.invalidateQueries({ queryKey: qk.meetings.all }),
        client.invalidateQueries({ queryKey: qk.channels() }),
      ]);
    },
  });
}
