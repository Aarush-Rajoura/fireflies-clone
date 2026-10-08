import type { QueryClient } from "@tanstack/react-query";

import { qk } from "@/lib/api";

/** Prefix shared by every optimistic action-item mutation of one meeting. */
export const actionItemMutationScope = (meetingId: number) => ["action-items", meetingId] as const;

/**
 * Refetch only once the LAST optimistic edit or delete settles: refetching
 * while another is still in flight would flash its optimistic change away.
 * Called from onSettled, where the settling mutation still counts as one.
 */
export function settleActionItems(client: QueryClient, meetingId: number) {
  if (client.isMutating({ mutationKey: actionItemMutationScope(meetingId) }) > 1) return;
  // The Tasks page lists these same rows across meetings.
  void client.invalidateQueries({ queryKey: qk.tasks.all });
  return client.invalidateQueries({ queryKey: qk.actionItems(meetingId) });
}
