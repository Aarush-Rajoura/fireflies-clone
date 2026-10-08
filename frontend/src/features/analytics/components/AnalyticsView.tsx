"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SegmentedControl, Skeleton, StateView } from "@/components/ui";
import type { AnalyticsOverview, AnalyticsRange } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

import { useAnalyticsOverview } from "../hooks/useAnalyticsOverview";
import {
  DEFAULT_RANGE,
  formatHour,
  isAnalyticsRange,
  RANGE_OPTIONS,
  rangePhrase,
  WEEKDAYS,
} from "../lib/format";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { AnalyticsEmpty } from "./AnalyticsEmpty";
import { ChartCard } from "./ChartCard";
import { MeetingsPerWeekChart } from "./MeetingsPerWeekChart";
import { SourcesBreakdown } from "./SourcesBreakdown";
import { StatTiles } from "./StatTiles";
import { TalkTimeChart } from "./TalkTimeChart";
import { TopTopics } from "./TopTopics";

function busiestLine({ busiest_weekday: day, busiest_hour: hour }: AnalyticsOverview["activity"]) {
  if (day === null || hour === null) return "Local to your time zone";
  return `Busiest on ${WEEKDAYS[day]}s, most often around ${formatHour(hour)}`;
}

function Dashboard({ data, onShowAll }: { data: AnalyticsOverview; onShowAll: () => void }) {
  const weeks = data.meetings_per_week.length;
  return (
    <div className="flex flex-col gap-4">
      {data.totals.meetings === 0 && <AnalyticsEmpty range={data.range} onShowAll={onShowAll} />}
      <StatTiles totals={data.totals} />
      <ChartCard
        title="Meetings per week"
        description={`${weeks} week${weeks === 1 ? "" : "s"}, Monday to Sunday in ${data.tz}`}
      >
        <MeetingsPerWeekChart weeks={data.meetings_per_week} />
      </ChartCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Talk time" description="Share of everything said, by person">
          <TalkTimeChart talk={data.talk_time} />
        </ChartCard>
        <ChartCard title="Top topics" description="Keywords raised in the most meetings">
          <TopTopics keywords={data.top_keywords} />
        </ChartCard>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <ChartCard title="When you meet" description={busiestLine(data.activity)}>
          <ActivityHeatmap activity={data.activity} />
        </ChartCard>
        <ChartCard title="Sources" description="How meetings were added">
          <SourcesBreakdown sources={data.sources} />
        </ChartCard>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-card" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-card" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    </div>
  );
}

/**
 * The `/analytics` dashboard. The range lives in the URL (`?range=`) so a
 * view is shareable; the time zone is always the viewer's own.
 */
export function AnalyticsView() {
  const router = useRouter();
  const pathname = usePathname();
  // Read from the URL on every render so back/forward and pasted links stay in sync.
  const param = useSearchParams().get("range");
  const range: AnalyticsRange = isAnalyticsRange(param) ? param : DEFAULT_RANGE;
  const overview = useAnalyticsOverview(range);

  const changeRange = (next: AnalyticsRange) => {
    const qs = next === DEFAULT_RANGE ? "" : `?range=${next}`;
    router.push(`${pathname}${qs}`, { scroll: false });
  };

  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-6 px-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-display text-strong">Analytics</h2>
          <p className="mt-1 text-body text-secondary">
            Meetings, talk time and topics across your workspace for {rangePhrase(range)}
            {overview.tz ? ` · ${overview.tz}` : ""}
          </p>
        </div>
        <SegmentedControl
          label="Date range"
          options={RANGE_OPTIONS}
          value={range}
          onChange={changeRange}
        />
      </header>
      <div
        aria-busy={overview.isPlaceholderData}
        className={cn(
          "transition-opacity duration-base",
          overview.isPlaceholderData && "opacity-60",
        )}
      >
        <StateView
          query={overview}
          isEmpty={() => false}
          empty={null}
          loading={<DashboardSkeleton />}
          errorMessage="Analytics failed to load. Check your connection and try again."
        >
          {(data) => <Dashboard data={data} onShowAll={() => changeRange("all")} />}
        </StateView>
      </div>
    </div>
  );
}
