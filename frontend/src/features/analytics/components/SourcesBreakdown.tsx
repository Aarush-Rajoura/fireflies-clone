import {
  CalendarDays,
  ClipboardPaste,
  Database,
  Mic,
  PencilLine,
  Upload,
  type LucideIcon,
} from "lucide-react";

import type { AnalyticsOverview, MeetingSource } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

import { formatPercent, SOURCE_LABELS } from "../lib/format";
import { fraction } from "../lib/scale";

const SOURCE_ICONS: Record<MeetingSource, LucideIcon> = {
  upload: Upload,
  paste: ClipboardPaste,
  manual: PencilLine,
  seed: Database,
  calendar: CalendarDays,
  capture: Mic,
};

/** How meetings got into the workspace, largest first; empty sources stay listed but quiet. */
export function SourcesBreakdown({ sources }: { sources: AnalyticsOverview["sources"] }) {
  const total = sources.reduce((sum, s) => sum + s.meetings, 0);
  const max = Math.max(0, ...sources.map((s) => s.meetings));
  const sorted = [...sources].sort(
    (a, b) =>
      b.meetings - a.meetings || SOURCE_LABELS[a.source].localeCompare(SOURCE_LABELS[b.source]),
  );
  return (
    <ul className="flex flex-col gap-3.5">
      {sorted.map(({ source, meetings }) => {
        const Icon = SOURCE_ICONS[source];
        return (
          <li key={source} className={cn("flex flex-col gap-1.5", meetings === 0 && "opacity-60")}>
            <div className="flex items-center gap-2 text-body">
              <Icon aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-muted" />
              <span className="min-w-0 flex-1 truncate text-primary">{SOURCE_LABELS[source]}</span>
              <span className="tnum text-body-strong text-primary">{meetings}</span>
              <span className="tnum w-10 text-right text-meta text-muted">
                {total ? formatPercent(meetings / total) : "–"}
              </span>
            </div>
            <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${fraction(meetings, max) * 100}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
