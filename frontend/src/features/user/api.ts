import { unwrap, type User } from "@/lib/api";
import { api } from "@/lib/api/client";

/** The demo user's own profile (there is no real auth yet). */
export function fetchMe(signal?: AbortSignal): Promise<User> {
  return unwrap(api.GET("/api/v1/me", { signal }));
}
