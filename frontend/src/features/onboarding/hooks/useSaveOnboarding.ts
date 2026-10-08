"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui";
import { qk, type Me } from "@/lib/api";

import { saveOnboarding } from "../api";

/**
 * Saves the answers and puts the returned profile in the cache, so the app's
 * onboarding gate sees `onboarded_at` at once. `onSaved` is hook-level (not
 * per-call) so the global toast's Retry still navigates on success.
 */
export function useSaveOnboarding(onSaved: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: saveOnboarding,
    onSuccess: ({ invites_sent, ...me }) => {
      client.setQueryData<Me>(qk.me(), me);
      if (invites_sent > 0) {
        const who = `${invites_sent} coworker${invites_sent === 1 ? "" : "s"}`;
        toast.info(`Saved. Invites for ${who} go out when team invites launch.`);
      }
      onSaved();
    },
  });
}
