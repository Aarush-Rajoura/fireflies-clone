export type HomeTab = "recent" | "upcoming" | "ai-feed";

const TABS: readonly HomeTab[] = ["recent", "upcoming", "ai-feed"];

/** Unknown or missing values fall back to Recent rather than an empty panel. */
export function parseHomeTab(value: string | null | undefined): HomeTab {
  return TABS.find((t) => t === value) ?? "recent";
}
