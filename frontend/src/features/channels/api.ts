import { unwrap, type Channel, type Page } from "@/lib/api";
import { api } from "@/lib/api/client";

/** The sidebar shows every channel at once; 100 is the API's page-size ceiling. */
export function fetchChannels(signal?: AbortSignal): Promise<Page<Channel>> {
  return unwrap(api.GET("/api/v1/channels", { params: { query: { page_size: 100 } }, signal }));
}

export function createChannel(name: string): Promise<Channel> {
  return unwrap(api.POST("/api/v1/channels", { body: { name } }));
}

export function renameChannel(id: number, name: string): Promise<Channel> {
  return unwrap(
    api.PATCH("/api/v1/channels/{channel_id}", {
      params: { path: { channel_id: id } },
      body: { name },
    }),
  );
}

export function deleteChannel(id: number): Promise<void> {
  return unwrap(
    api.DELETE("/api/v1/channels/{channel_id}", { params: { path: { channel_id: id } } }),
  ) as Promise<void>;
}
