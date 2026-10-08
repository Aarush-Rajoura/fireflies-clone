import type { MeetingListItem, Page } from "@/lib/api";

/** A complete list row; override only what a test is about. */
export function meetingFixture(overrides: Partial<MeetingListItem> = {}): MeetingListItem {
  return {
    id: 1,
    title: "Weekly product sync",
    started_at: "2026-10-07T09:00:00Z",
    duration_ms: 32 * 60_000,
    host: { id: 1, name: "Ada Lovelace", avatar_url: null },
    participants: [
      { id: 1, display_name: "Ada Lovelace" },
      { id: 2, display_name: "Grace Hopper" },
      { id: 3, display_name: "Alan Turing" },
      { id: 4, display_name: "Linus Torvalds" },
      { id: 5, display_name: "Margaret Hamilton" },
    ],
    participant_count: 7,
    action_item_counts: { open: 3, completed: 1 },
    keywords: ["roadmap", "pricing", "hiring", "launch"],
    tags: [],
    overview_preview: null,
    has_media: false,
    status: "completed",
    channel: { id: 9, name: "product", slug: "product" },
    channel_id: 9,
    language: "en",
    meeting_url: null,
    platform: null,
    ...overrides,
  };
}

export function pageOf(items: MeetingListItem[]): Page<MeetingListItem> {
  return { items, page: 1, page_size: 20, total: items.length, total_pages: 1, has_next: false };
}
