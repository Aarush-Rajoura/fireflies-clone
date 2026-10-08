"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui";
import { qk } from "@/lib/api";

import { saveOnboarding } from "../api";

/**
 * Saves the answers and invalidates /me, so no cached profile with a null
 * `onboarded_at` sends the user back to the wizard. `onSaved` is hook-level
 * (not per-call) so the global toast's Retry still navigates on success.
 */
export function useSaveOnboarding(onSaved: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: saveOnboarding,
    onSuccess: async ({ invites_sent }) => {
      await client.invalidateQueries({ queryKey: qk.me() });
      if (invites_sent > 0) {
        const who = `${invites_sent} coworker${invites_sent === 1 ? "" : "s"}`;
        toast.info(`Saved. Invites for ${who} go out when team invites launch.`);
      }
      onSaved();
    },
  });
}
