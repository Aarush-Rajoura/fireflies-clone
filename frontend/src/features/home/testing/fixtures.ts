import type { MeetingDetail, MeetingListItem, Page } from "@/lib/api";

export const page = <T>(items: T[]): Page<T> => ({
  items,
  page: 1,
  page_size: 20,
  total: items.length,
  total_pages: items.length ? 1 : 0,
  has_next: false,
});

export const listItem = (over: Partial<MeetingListItem> = {}): MeetingListItem => ({
  id: 1,
  title: "Fireflies AI Platform Quick Overview",
  started_at: "2024-08-08T15:52:00Z",
  duration_ms: 0,
  host: { id: 1, name: "Ada Lovelace" },
  participant_count: 1,
  participants: [],
  action_item_counts: { open: 0, completed: 0 },
  keywords: [],
  tags: [],
  has_media: false,
  status: "completed",
  channel_id: null,
  channel: null,
  meeting_url: null,
  platform: null,
  language: "en",
  auto_join: false,
  overview_preview: null,
  ...over,
});

export const detail = (over: Partial<MeetingDetail> = {}): MeetingDetail => ({
  ...listItem(),
  participants: [],
  description: null,
  speakers: [],
  source: "manual",
  media_type: "none",
  summary_status: "none",
  suggested_tags: [],
  ...over,
});

/** Radix Switch measures itself; jsdom has no ResizeObserver. */
export function stubResizeObserver() {
  if (typeof globalThis.ResizeObserver !== "undefined") return;
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
