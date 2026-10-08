import type { MeetingDetail } from "@/lib/api";

export const meeting: MeetingDetail = {
  id: 7,
  title: "Launch Go/No-Go",
  description: null,
  started_at: "2026-03-15T11:30:00Z",
  duration_ms: 20 * 60_000,
  has_media: false,
  media_type: "none",
  status: "completed",
  channel: { id: 3, name: "Product", slug: "product" },
  channel_id: 3,
  host: { id: 1, name: "Sarah Watts" },
  participants: [
    { id: 11, display_name: "Sarah Watts", email: null, role: "host", talk_ms: 0, user_id: 1 },
    { id: 12, display_name: "Janice", email: null, role: "attendee", talk_ms: 0, user_id: null },
    { id: 13, display_name: "Chris", email: null, role: "attendee", talk_ms: 0, user_id: null },
  ],
  participant_count: 3,
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
};

export const json = (body: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const errorJson = (status: number, code: string, message = code) =>
  json({ error: { code, message, details: {} } }, status);

export type Route = (
  req: Request,
  url: URL,
) => Response | undefined | Promise<Response | undefined>;

/** Stubs global fetch; unmatched requests answer 404 so a missing route is loud. */
export function routeFetch(route: Route) {
  const fetchMock = async (req: Request) => {
    const url = new URL(req.url);
    return (await route(req, url)) ?? errorJson(404, "NOT_FOUND", `${req.method} ${url.pathname}`);
  };
  return fetchMock;
}
