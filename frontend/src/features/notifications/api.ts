import { unwrap, type Notification, type Page } from "@/lib/api";
import { api } from "@/lib/api/client";

export const NOTIFICATION_PAGE_SIZE = 20;

/** Unread first, then newest. */
export function fetchNotifications(signal?: AbortSignal): Promise<Page<Notification>> {
  return unwrap(
    api.GET("/api/v1/notifications", {
      params: { query: { page_size: NOTIFICATION_PAGE_SIZE } },
      signal,
    }),
  );
}

export function setNotificationRead(id: number, read: boolean): Promise<Notification> {
  return unwrap(
    api.PATCH("/api/v1/notifications/{notification_id}", {
      params: { path: { notification_id: id } },
      body: { read },
    }),
  );
}

export function markAllNotificationsRead(): Promise<void> {
  return unwrap(api.POST("/api/v1/notifications/read-all")) as Promise<void>;
}
