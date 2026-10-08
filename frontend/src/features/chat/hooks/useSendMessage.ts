"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  qk,
  type ChatExchange,
  type ChatMessage,
  type ChatMessageCreate,
  type ChatThreadDetail,
} from "@/lib/api";

import { createChat, sendChatMessage } from "../api";

/** Negative ids never collide with the server's, so the optimistic bubble is easy to find. */
let nextTempId = -1;

export function optimisticUserMessage(question: string): ChatMessage {
  return {
    id: nextTempId--,
    role: "user",
    content: question,
    skill: null,
    provider: null,
    model: null,
    created_at: new Date().toISOString(),
    citations: [],
  };
}

function withExchange(thread: ChatThreadDetail | undefined, exchange: ChatExchange) {
  const kept = (thread?.messages ?? []).filter((m) => m.id > 0);
  return {
    ...exchange.thread,
    messages: [...kept, exchange.user_message, exchange.assistant_message],
  } satisfies ChatThreadDetail;
}

function useRefreshHistory() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: [...qk.chats.all, "list"] });
}

/**
 * Starts a thread. The caller shows the question while it is pending (there is
 * no thread to put it in yet) and navigates to the new thread on success,
 * which finds its messages already in the cache.
 */
export function useCreateChat() {
  const client = useQueryClient();
  const refresh = useRefreshHistory();
  return useMutation({
    mutationFn: (body: ChatMessageCreate) => createChat(body),
    // The view explains failures inline, next to the question that failed.
    meta: { errorToast: false },
    // A failed answer still leaves the new thread (with its question) in the history.
    onError: () => refresh(),
    onSuccess: async (exchange) => {
      client.setQueryData(qk.chats.detail(exchange.thread.id), withExchange(undefined, exchange));
      await refresh();
    },
  });
}

/** A follow-up: the question appears at once and is rolled back if it fails. */
export function useSendMessage(threadId: number) {
  const client = useQueryClient();
  const refresh = useRefreshHistory();
  const key = qk.chats.detail(threadId);
  return useMutation({
    mutationFn: (body: ChatMessageCreate) => sendChatMessage(threadId, body),
    meta: { errorToast: false },
    onMutate: async (body) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<ChatThreadDetail>(key);
      if (previous) {
        client.setQueryData<ChatThreadDetail>(key, {
          ...previous,
          messages: [...previous.messages, optimisticUserMessage(body.question)],
        });
      }
      return { previous };
    },
    onError: async (_error, _body, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
      // The server saves the question before the AI runs, so it may exist even though this failed.
      await Promise.all([client.invalidateQueries({ queryKey: key }), refresh()]);
    },
    onSuccess: async (exchange) => {
      client.setQueryData<ChatThreadDetail>(key, (thread) => withExchange(thread, exchange));
      await refresh();
    },
  });
}
