/*
 * The only module that reads process.env. Next inlines NEXT_PUBLIC_* at build
 * time only when the property is accessed literally, so each key is spelled
 * out rather than looked up dynamically.
 */
const DEFAULT_BACKEND_URL = "http://localhost:8000";

export const env = {
  /*
   * The browser always calls its own origin; next.config.ts rewrites /api/* to
   * the backend. Same-origin means no CORS and no third-party cookies on free
   * hosting, so the client base URL is deliberately empty.
   */
  apiBaseUrl: "",
  /** Server-only: where the /api rewrite points. Read by next.config.ts at build/start. */
  backendUrl: (process.env.BACKEND_URL ?? DEFAULT_BACKEND_URL).replace(/\/+$/, ""),
  showDevPages:
    process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SHOW_DEV_PAGES === "1",
  isDev: process.env.NODE_ENV === "development",
} as const;
