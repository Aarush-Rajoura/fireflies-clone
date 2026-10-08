import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";

import { AppProviders } from "@/components/ui";
import type { MeetingDetail } from "@/lib/api";
import { makeQueryClient } from "@/lib/query/query-client";

export function renderWithClient(ui: ReactElement) {
  const client = makeQueryClient(() => undefined);
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <AppProviders>{ui}</AppProviders>
      </QueryClientProvider>,
    ),
  };
}

/** Just enough of a meeting for the tag editor. */
export function meetingFixture(overrides: Partial<MeetingDetail> = {}): MeetingDetail {
  return {
    id: 7,
    title: "Launch Go/No-Go",
    description: null,
    started_at: "2026-03-15T11:30:00Z",
    duration_ms: 20 * 60_000,
    has_media: false,
    media_type: "none",
    status: "completed",
    channel: null,
    channel_id: null,
    host: { id: 1, name: "Sarah Watts" },
    participants: [],
    participant_count: 0,
    speakers: [],
    action_item_counts: { open: 0, completed: 0 },
    keywords: [],
    language: "en",
    meeting_url: null,
    platform: null,
    source: "upload",
    suggested_tags: [],
    summary_status: "ready",
    tags: [],
    ...overrides,
  };
}
