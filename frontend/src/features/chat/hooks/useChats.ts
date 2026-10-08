"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui";
import { qk } from "@/lib/api";

import { deleteChat, fetchChat, fetchChats, fetchChatSkills } from "../api";

/** The history column; `q` filters by title or message text on the server. */
export function useChats(q: string) {
  const query = q.trim();
  return useQuery({
    queryKey: qk.chats.list(query),
    queryFn: ({ signal }) => fetchChats(query, signal),
    // Typing a filter keeps the previous list on screen instead of flashing a skeleton.
    placeholderData: keepPreviousData,
  });
}

export function useChat(id: number | undefined) {
  return useQuery({
    queryKey: qk.chats.detail(id ?? 0),
    queryFn: ({ signal }) => fetchChat(id ?? 0, signal),
    enabled: id !== undefined,
  });
}

/** The /skills menu. Static on the server, so it is fetched once per session. */
export function useChatSkills() {
  return useQuery({
    queryKey: qk.chatSkills(),
    queryFn: ({ signal }) => fetchChatSkills(signal),
    staleTime: Infinity,
  });
}

export function useDeleteChat() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteChat(id),
    onSuccess: async (_, id) => {
      client.removeQueries({ queryKey: qk.chats.detail(id) });
      toast.success("Chat deleted");
      await client.invalidateQueries({ queryKey: [...qk.chats.all, "list"] });
    },
  });
}
