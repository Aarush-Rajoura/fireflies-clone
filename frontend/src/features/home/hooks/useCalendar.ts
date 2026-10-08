"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui";
import { ApiError, qk, type CalendarProvider } from "@/lib/api";

import { connectCalendar, fetchCalendarConnections } from "../api";

export const PROVIDER_LABEL: Record<CalendarProvider, string> = {
  google: "Google Calendar",
  outlook: "Outlook",
};

export function useCalendarConnections(enabled = true) {
  return useQuery({
    queryKey: qk.calendarConnections(),
    queryFn: ({ signal }) => fetchCalendarConnections(signal),
    enabled,
  });
}

/** Connected providers as a set, so buttons can show "Connected". */
export function useConnectedProviders(enabled = true): ReadonlySet<CalendarProvider> {
  const { data } = useCalendarConnections(enabled);
  return new Set(data?.items.map((c) => c.provider) ?? []);
}

export function useConnectCalendar({ onConnected }: { onConnected?: () => void } = {}) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: connectCalendar,
    onSuccess: () => {
      toast.success("Demo connection — 3 sample meetings imported");
      onConnected?.();
    },
    onError: (error, provider) => {
      const reason = error instanceof ApiError ? error.message : "Please try again.";
      toast.error(`Couldn't connect ${PROVIDER_LABEL[provider]}. ${reason}`);
    },
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: qk.calendarConnections() }),
        client.invalidateQueries({ queryKey: qk.meetings.lists() }),
        client.invalidateQueries({ queryKey: qk.notifications() }),
      ]),
  });
}
