import {
  unwrap,
  type ChatExchange,
  type ChatMessageCreate,
  type ChatSkill,
  type ChatThread,
  type ChatThreadDetail,
  type MeetingDetail,
  type MeetingListItem,
  type Page,
} from "@/lib/api";
import { api } from "@/lib/api/client";

/** History is one scrolling column, so it asks for the API's largest page. */
export function fetchChats(q: string, signal?: AbortSignal): Promise<Page<ChatThread>> {
  const query = { page_size: 100, ...(q ? { q } : {}) };
  return unwrap(api.GET("/api/v1/chats", { params: { query }, signal }));
}

export function fetchChat(id: number, signal?: AbortSignal): Promise<ChatThreadDetail> {
  return unwrap(api.GET("/api/v1/chats/{chat_id}", { params: { path: { chat_id: id } }, signal }));
}

export function createChat(body: ChatMessageCreate): Promise<ChatExchange> {
  return unwrap(api.POST("/api/v1/chats", { body }));
}

export function sendChatMessage(id: number, body: ChatMessageCreate): Promise<ChatExchange> {
  return unwrap(
    api.POST("/api/v1/chats/{chat_id}/messages", { params: { path: { chat_id: id } }, body }),
  );
}

export function deleteChat(id: number): Promise<void> {
  return unwrap(
    api.DELETE("/api/v1/chats/{chat_id}", { params: { path: { chat_id: id } } }),
  ) as Promise<void>;
}

/** The @-context of a reopened thread; a deleted meeting (410) means no context. */
export function fetchMeetingContext(id: number, signal?: AbortSignal): Promise<MeetingDetail> {
  return unwrap(
    api.GET("/api/v1/meetings/{meeting_id}", { params: { path: { meeting_id: id } }, signal }),
  );
}

export function fetchChatSkills(signal?: AbortSignal): Promise<ChatSkill[]> {
  return unwrap(api.GET("/api/v1/chat-skills", { signal }));
}

/** Meetings to @-mention: recent ones first, upcoming ones too (so "prepare me" can target them). */
export async function searchMeetingsForContext(
  q: string,
  signal?: AbortSignal,
): Promise<MeetingListItem[]> {
  const base = { page_size: 6, ...(q ? { q } : {}) };
  const [past, upcoming] = await Promise.all([
    unwrap(api.GET("/api/v1/meetings", { params: { query: base }, signal })),
    unwrap(
      api.GET("/api/v1/meetings", {
        params: { query: { ...base, page_size: 3, status: "upcoming" } },
        signal,
      }),
    ),
  ]);
  return [...upcoming.items, ...past.items];
}
