"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui";
import { ApiError, qk } from "@/lib/api";

import { regenerateSummary } from "../api";

export type RegenerateFeedback = { kind: "info" | "error"; message: string };

/** Maps a failed regenerate to the toast it deserves; pure so it is testable. */
export function regenerateErrorFeedback(error: unknown): RegenerateFeedback {
  if (error instanceof ApiError) {
    if (error.status === 409) return { kind: "info", message: "Already generating" };
    if (error.status === 503) {
      return { kind: "error", message: "AI unavailable — showing the last summary" };
    }
    if (error.status === 429) {
      return { kind: "error", message: "Too many AI requests. Try again in a minute." };
    }
    if (error.message) return { kind: "error", message: error.message };
  }
  return { kind: "error", message: "Couldn't regenerate the summary." };
}

export function useRegenerateSummary(meetingId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => regenerateSummary(meetingId),
    // Each failure has a specific message below; the generic global toast would duplicate it.
    meta: { errorToast: false },
    onSuccess: (summary) => {
      client.setQueryData(qk.summary(meetingId), summary);
      toast.success("Summary regenerated");
    },
    onError: (error) => {
      const { kind, message } = regenerateErrorFeedback(error);
      if (kind === "info") toast.info(message);
      else toast.error(message);
    },
    // A 409 means another run is in flight; refetching picks up whichever finished.
    onSettled: () => client.invalidateQueries({ queryKey: qk.summary(meetingId) }),
  });
}
