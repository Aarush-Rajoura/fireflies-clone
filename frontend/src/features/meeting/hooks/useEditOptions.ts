"use client";

import { useQuery } from "@tanstack/react-query";

import { qk } from "@/lib/api";

import { getChannels, getUsers } from "../api";

// Both lists change rarely; the edit modal only needs them while it is open.
const STALE_MS = 5 * 60_000;

export function useChannels(enabled = true) {
  return useQuery({
    queryKey: qk.channels(),
    queryFn: ({ signal }) => getChannels(signal),
    select: (page) => page.items,
    staleTime: STALE_MS,
    enabled,
  });
}

export function useUsers(enabled = true) {
  return useQuery({
    queryKey: qk.users(),
    queryFn: ({ signal }) => getUsers(signal),
    select: (page) => page.items,
    staleTime: STALE_MS,
    enabled,
  });
}
