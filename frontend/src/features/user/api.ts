import { unwrap, type Me, type Usage } from "@/lib/api";
import { api } from "@/lib/api/client";

/** The demo user's own profile (there is no real auth yet). */
export function fetchMe(signal?: AbortSignal): Promise<Me> {
  return unwrap(api.GET("/api/v1/me", { signal }));
}

export function fetchUsage(signal?: AbortSignal): Promise<Usage> {
  return unwrap(api.GET("/api/v1/me/usage", { signal }));
}
