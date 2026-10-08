import type { IntegrationCategory, IntegrationListParams } from "@/lib/api";

export type IntegrationsTab = "discover" | "connected";

export type IntegrationsParams = {
  tab: IntegrationsTab;
  category?: IntegrationCategory;
  q?: string;
};

export const CATEGORIES: readonly IntegrationCategory[] = [
  "audio-recording",
  "ats",
  "crm",
  "mcp",
  "video-conferencing",
  "calendar",
  "project-management",
  "notes",
  "collaboration",
  "dialers",
  "storage",
];

/** Shown as chips, as in the catalogue page; the rest sit behind "More". */
export const PRIMARY_CATEGORIES: readonly IntegrationCategory[] = [
  "audio-recording",
  "ats",
  "crm",
  "mcp",
];

/** Every integration fits one page (the API ceiling), so the grid never paginates. */
export const PAGE_SIZE = 100;

function isCategory(value: string | null): value is IntegrationCategory {
  return value !== null && (CATEGORIES as readonly string[]).includes(value);
}

/** Unknown values are dropped rather than sent, so a stale link still shows the catalogue. */
export function parseIntegrationsParams(search: URLSearchParams): IntegrationsParams {
  const category = search.get("category");
  const q = search.get("q")?.trim();
  return {
    tab: search.get("tab") === "connected" ? "connected" : "discover",
    category: isCategory(category) ? category : undefined,
    q: q || undefined,
  };
}

export function serializeIntegrationsParams(params: IntegrationsParams): string {
  const out = new URLSearchParams();
  if (params.tab === "connected") out.set("tab", "connected");
  if (params.category) out.set("category", params.category);
  if (params.q) out.set("q", params.q);
  return out.toString();
}

/** Category and search narrow Discover only; Connected always lists every connection. */
export function toListQuery(params: IntegrationsParams): IntegrationListParams {
  if (params.tab === "connected") return { connected: true, page_size: PAGE_SIZE };
  return {
    page_size: PAGE_SIZE,
    ...(params.category && { category: params.category }),
    ...(params.q && { q: params.q }),
  };
}
