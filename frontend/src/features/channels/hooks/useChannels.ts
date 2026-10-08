"use client";

import { useQuery } from "@tanstack/react-query";

import { qk } from "@/lib/api";

import { fetchChannels } from "../api";

export function useChannels() {
  return useQuery({
    queryKey: qk.channels(),
    queryFn: ({ signal }) => fetchChannels(signal),
    select: (page) => page.items,
  });
}
