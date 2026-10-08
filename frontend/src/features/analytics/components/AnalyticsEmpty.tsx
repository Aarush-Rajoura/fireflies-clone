import { ChartNoAxesColumn } from "lucide-react";

import { Button } from "@/components/ui";
import type { AnalyticsRange } from "@/lib/api";

import { rangePhrase } from "../lib/format";

/**
 * Shown above the (all-zero) dashboard when a range has no meetings, so the
 * zeros read as "nothing happened" rather than "something broke".
 */
export function AnalyticsEmpty({
  range,
  onShowAll,
}: {
  range: AnalyticsRange;
  onShowAll?: () => void;
}) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-4 rounded-card border border-dashed border-strong bg-surface-sunken px-5 py-4"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-item bg-accent-faint text-accent">
        <ChartNoAxesColumn aria-hidden strokeWidth={1.75} className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body-strong text-primary">No meetings in {rangePhrase(range)}</p>
        <p className="text-meta text-muted">
          {range === "all"
            ? "Record, upload or paste a meeting and its numbers will show up here."
            : "Pick a longer range to see earlier activity."}
        </p>
      </div>
      {range !== "all" && onShowAll && (
        <Button variant="secondary" size="sm" onClick={onShowAll}>
          Show all time
        </Button>
      )}
    </div>
  );
}
