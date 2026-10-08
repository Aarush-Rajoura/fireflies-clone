import type {
  IntegrationListParams,
  MeetingListParams,
  SearchParams,
  TaskListParams,
} from "./types";

/*
 * Every TanStack Query key in the app comes from here, so invalidation can
 * target a whole family (`qk.meetings.all`) without string-matching.
 * Keys are hierarchical: everything about meeting 7 starts with ['meetings', 7].
 */
export const qk = {
  me: () => ["me"] as const,
  // Not under ['me']: profile edits must not refetch usage, and vice versa.
  usage: () => ["usage"] as const,
  meetings: {
    all: ["meetings"] as const,
    lists: () => ["meetings", "list"] as const,
    list: (filters: MeetingListParams = {}) => ["meetings", "list", filters] as const,
    detail: (id: number) => ["meetings", id] as const,
  },
  transcript: (id: number) => ["meetings", id, "transcript"] as const,
  summary: (id: number) => ["meetings", id, "summary"] as const,
  actionItems: (id: number) => ["meetings", id, "action-items"] as const,
  comments: (id: number) => ["meetings", id, "comments"] as const,
  highlights: (id: number) => ["meetings", id, "highlights"] as const,
  soundbites: (id: number) => ["meetings", id, "soundbites"] as const,
  // Spans meetings, so meeting-scoped edits invalidate it explicitly.
  tasks: {
    all: ["tasks"] as const,
    lists: () => ["tasks", "list"] as const,
    list: (params: TaskListParams = {}) => ["tasks", "list", params] as const,
  },
  channels: () => ["channels"] as const,
  tags: () => ["tags"] as const,
  users: () => ["users"] as const,
  feed: () => ["feed"] as const,
  calendarConnections: () => ["calendar-connections"] as const,
  notifications: () => ["notifications"] as const,
  integrations: {
    all: ["integrations"] as const,
    list: (params: IntegrationListParams = {}) => ["integrations", "list", params] as const,
    categories: () => ["integrations", "categories"] as const,
  },
  // Not under ['meetings']: search spans every meeting, so instead of being
  // invalidated by meeting edits its queries use staleTime 0 (see useSearch).
  search: {
    all: ["search"] as const,
    query: (q: string) => ["search", q] as const,
    page: ({ q, ...paging }: SearchParams) => ["search", q, paging] as const,
  },
};
