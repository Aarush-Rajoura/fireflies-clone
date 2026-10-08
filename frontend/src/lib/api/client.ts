import createClient, { type Client } from "openapi-fetch";

import { env } from "@/lib/env";
import type { paths } from "@/types/api";

/** The typed HTTP client. Swappable in tests by mocking this module or `fetch`. */
export type ApiClient = Client<paths>;

/*
 * Same origin: next.config.ts proxies /api/* to the backend. `Request` needs an
 * absolute URL outside a document, so the empty base resolves to this page's
 * origin in the browser and straight to the backend during server rendering.
 */
function resolveBaseUrl(): string {
  if (env.apiBaseUrl) return env.apiBaseUrl;
  return typeof window === "undefined" ? env.backendUrl : window.location.origin;
}

/* `fetch` is resolved per call rather than captured at import, so tests can stub the global. */
export const api: ApiClient = createClient<paths>({
  baseUrl: resolveBaseUrl(),
  fetch: (request) => globalThis.fetch(request),
});
