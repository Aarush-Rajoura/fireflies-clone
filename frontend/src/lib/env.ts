/*
 * Public env, read once. Next inlines NEXT_PUBLIC_* at build time only when the
 * property is accessed literally, so each key is spelled out rather than looked
 * up dynamically.
 */
const DEFAULT_API_URL = "http://localhost:8000";

export const env = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, ""),
  showDevPages:
    process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SHOW_DEV_PAGES === "1",
} as const;
