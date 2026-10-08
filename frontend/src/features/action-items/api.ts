import { unwrap, type ActionItem, type ActionItemCreate, type ActionItemUpdate } from "@/lib/api";
import { api } from "@/lib/api/client";

const PAGE_SIZE = 100; // the server's cap

/** Every action item of a meeting, following pages: the list is shown whole, grouped by person. */
export async function fetchActionItems(
  meetingId: number,
  signal?: AbortSignal,
): Promise<ActionItem[]> {
  const items: ActionItem[] = [];
  for (let page = 1; ; page++) {
    const res = await unwrap(
      api.GET("/api/v1/meetings/{meeting_id}/action-items", {
        params: { path: { meeting_id: meetingId }, query: { page, page_size: PAGE_SIZE } },
        signal,
      }),
    );
    items.push(...res.items);
    if (!res.has_next) return items;
  }
}

export function createActionItem(meetingId: number, body: ActionItemCreate): Promise<ActionItem> {
  return unwrap(
    api.POST("/api/v1/meetings/{meeting_id}/action-items", {
      params: { path: { meeting_id: meetingId } },
      body,
    }),
  );
}

export function updateActionItem(id: number, body: ActionItemUpdate): Promise<ActionItem> {
  return unwrap(
    api.PATCH("/api/v1/action-items/{item_id}", { params: { path: { item_id: id } }, body }),
  );
}

export function deleteActionItem(id: number): Promise<void> {
  return unwrap(
    api.DELETE("/api/v1/action-items/{item_id}", { params: { path: { item_id: id } } }),
  ) as Promise<void>;
}
