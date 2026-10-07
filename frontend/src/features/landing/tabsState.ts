// Pure helpers for the AI Summaries tablist (roving tabindex, automatic activation).
import { SUMMARY_TABS, type SummaryTab, type SummaryTabId } from "./content";

/** Next tab index for a key press inside a horizontal tablist, or null if the key is not handled. */
export function nextTabIndex(current: number, key: string, count: number): number | null {
  if (count <= 0) return null;
  switch (key) {
    case "ArrowRight":
      return (current + 1) % count;
    case "ArrowLeft":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

export function findSummaryTab(id: SummaryTabId, tabs: SummaryTab[] = SUMMARY_TABS): SummaryTab {
  const tab = tabs.find((t) => t.id === id) ?? tabs[0];
  if (!tab) throw new Error("SUMMARY_TABS must not be empty");
  return tab;
}
