import type { Page, SearchHit } from "@/lib/api";

let nextSegment = 1;

export function hit(overrides: Partial<SearchHit> = {}): SearchHit {
  const segment_id = overrides.segment_id ?? nextSegment++;
  return {
    meeting_id: 1,
    meeting_title: "Launch sync",
    segment_id,
    start_ms: 65_000,
    speaker: "Ada",
    snippet: "the launch is next week",
    ranges: [{ start: 4, end: 10 }],
    ...overrides,
  };
}

export function page(
  items: SearchHit[],
  overrides: Partial<Page<SearchHit>> = {},
): Page<SearchHit> {
  return {
    items,
    page: 1,
    page_size: 20,
    total: items.length,
    total_pages: items.length ? 1 : 0,
    has_next: false,
    ...overrides,
  };
}
