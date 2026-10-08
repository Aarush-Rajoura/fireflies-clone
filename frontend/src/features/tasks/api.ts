import {
  unwrap,
  type ActionItem,
  type ActionItemUpdate,
  type TaskCreate,
  type TaskListParams,
} from "@/lib/api";
import { api } from "@/lib/api/client";

const PAGE_SIZE = 100; // the server's cap

/** Every task matching the filters, following pages: the list is grouped by due date, so it is shown whole. */
export async function fetchTasks(
  params: TaskListParams,
  signal?: AbortSignal,
): Promise<ActionItem[]> {
  const items: ActionItem[] = [];
  for (let page = 1; ; page++) {
    const res = await unwrap(
      api.GET("/api/v1/action-items", {
        params: { query: { ...params, page, page_size: PAGE_SIZE } },
        signal,
      }),
    );
    items.push(...res.items);
    if (!res.has_next) return items;
  }
}

export function createTask(body: TaskCreate): Promise<ActionItem> {
  return unwrap(api.POST("/api/v1/action-items", { body }));
}

export function updateTask(id: number, body: ActionItemUpdate): Promise<ActionItem> {
  return unwrap(
    api.PATCH("/api/v1/action-items/{item_id}", { params: { path: { item_id: id } }, body }),
  );
}

export function deleteTask(id: number): Promise<void> {
  return unwrap(
    api.DELETE("/api/v1/action-items/{item_id}", { params: { path: { item_id: id } } }),
  ) as Promise<void>;
}
