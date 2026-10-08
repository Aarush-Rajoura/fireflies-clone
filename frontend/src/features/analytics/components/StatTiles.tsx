import { CalendarDays, Clock, ListChecks, Users } from "lucide-react";
import type { ReactNode } from "react";

import type { AnalyticsOverview } from "@/lib/api";

import { formatDuration, formatPercent } from "../lib/format";
import { fraction } from "../lib/scale";

type Totals = AnalyticsOverview["totals"];

function Tile({
  icon,
  label,
  value,
  detail,
  children,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-card border border-subtle bg-surface-1 p-5">
      <dt className="flex items-center gap-2 text-caption text-secondary [&_svg]:size-4 [&_svg]:text-muted">
        {icon}
        {label}
      </dt>
      <dd className="tnum mt-3 text-display text-strong">{value}</dd>
      <dd className="mt-1 text-meta text-muted">{detail}</dd>
      {children}
    </div>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The four headline numbers. A completion bar, not a donut: one length is easier to read. */
export function StatTiles({ totals }: { totals: Totals }) {
  const rate = totals.completion_rate;
  return (
    <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Tile
        icon={<CalendarDays strokeWidth={1.75} />}
        label="Meetings"
        value={String(totals.meetings)}
        detail={
          totals.meetings ? `${formatDuration(totals.avg_duration_ms)} on average` : "None yet"
        }
      />
      <Tile
        icon={<Clock strokeWidth={1.75} />}
        label="Time in meetings"
        value={formatDuration(totals.total_duration_ms)}
        detail="Recorded duration"
      />
      <Tile
        icon={<Users strokeWidth={1.75} />}
        label="Participants"
        value={String(totals.unique_participants)}
        detail="Unique people"
      />
      <Tile
        icon={<ListChecks strokeWidth={1.75} />}
        label="Action items done"
        value={formatPercent(rate)}
        detail={`${totals.action_items_completed} of ${plural(totals.action_items_created, "item")}`}
      >
        <dd className="mt-3">
          <div
            role="meter"
            aria-label="Action item completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(rate * 100)}
            className="h-1.5 overflow-hidden rounded-full bg-surface-3"
          >
            <div
              className="h-full rounded-full bg-success transition-[width] duration-base"
              style={{ width: `${fraction(rate, 1) * 100}%` }}
            />
          </div>
        </dd>
      </Tile>
    </dl>
  );
}
