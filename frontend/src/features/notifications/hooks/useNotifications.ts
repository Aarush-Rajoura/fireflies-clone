"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { qk, type Notification, type Page } from "@/lib/api";

import { fetchNotifications, markAllNotificationsRead, setNotificationRead } from "../api";

// Notifications are written by other actions; a gentle poll keeps the dot honest.
const POLL_MS = 60_000;

export function useNotifications() {
  return useQuery({
    queryKey: qk.notifications(),
    queryFn: ({ signal }) => fetchNotifications(signal),
    refetchInterval: POLL_MS,
  });
}

/** The list comes back unread-first, so the first page is enough to know. */
export function hasUnread(page: Page<Notification> | undefined): boolean {
  return page?.items.some((n) => n.read_at === null) ?? false;
}

type Snapshot = { previous?: Page<Notification> };

/** Optimistic: the dot and row styles update at once and roll back on failure. */
function useOptimisticRead<V>(
  mutationFn: (vars: V) => Promise<unknown>,
  apply: (n: Notification, vars: V, now: string) => Notification,
) {
  const client = useQueryClient();
  const key = qk.notifications();
  return useMutation<unknown, Error, V, Snapshot>({
    mutationFn,
    onMutate: async (vars) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<Page<Notification>>(key);
      const now = new Date().toISOString();
      if (previous) {
        client.setQueryData<Page<Notification>>(key, {
          ...previous,
          items: previous.items.map((n) => apply(n, vars, now)),
        });
      }
      return { previous };
    },
    onError: (_error, _vars, snapshot) => {
      if (snapshot?.previous) client.setQueryData(key, snapshot.previous);
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });
}

export function useMarkRead() {
  return useOptimisticRead<number>(
    (id) => setNotificationRead(id, true),
    (n, id, now) => (n.id === id && n.read_at === null ? { ...n, read_at: now } : n),
  );
}

export function useMarkAllRead() {
  return useOptimisticRead<void>(
    () => markAllNotificationsRead(),
    (n, _vars, now) => (n.read_at === null ? { ...n, read_at: now } : n),
  );
}
