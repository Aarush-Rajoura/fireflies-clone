import type { AnalyticsOverview } from "@/lib/api";
import { Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

import { formatHour, WEEKDAYS } from "../lib/format";
import { intensityLevel } from "../lib/scale";

// Literal class names so Tailwind can see them; index = intensity level.
const HEAT_BG = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"] as const;
const HOUR_TICKS = [0, 3, 6, 9, 12, 15, 18, 21];

const meetingsLabel = (n: number) => `${n} meeting${n === 1 ? "" : "s"}`;

function describe(activity: AnalyticsOverview["activity"]): string {
  const { busiest_weekday: day, busiest_hour: hour } = activity;
  if (day === null || hour === null) return "Meetings by weekday and hour: none in this range.";
  return `Meetings by weekday and hour. Busiest day: ${WEEKDAYS[day]}; busiest hour: ${formatHour(hour)}.`;
}

/** When meetings happen: weekday rows × local hour columns, darker = more meetings. */
export function ActivityHeatmap({ activity }: { activity: AnalyticsOverview["activity"] }) {
  const max = Math.max(0, ...activity.heatmap.flat());
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <div
          role="group"
          aria-label={describe(activity)}
          className="grid min-w-[480px] grid-cols-[2.25rem_repeat(24,minmax(0,1fr))] gap-[3px]"
        >
          {activity.heatmap.map((row, d) => (
            <div key={d} className="contents">
              <span className="pr-1 text-caption leading-4 text-muted">
                {WEEKDAYS[d]?.slice(0, 3)}
              </span>
              {row.map((count, h) => {
                const detail = `${WEEKDAYS[d]} ${formatHour(h)}: ${meetingsLabel(count)}`;
                return (
                  <Tooltip key={h} content={detail} side="top">
                    <div
                      role="img"
                      aria-label={detail}
                      className={cn("h-4 rounded-tag", HEAT_BG[intensityLevel(count, max)])}
                    />
                  </Tooltip>
                );
              })}
            </div>
          ))}
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="whitespace-nowrap pt-1 text-micro font-normal text-muted">
              {HOUR_TICKS.includes(h) ? formatHour(h).replace(" ", "").toLowerCase() : ""}
            </span>
          ))}
        </div>
      </div>
      <div aria-hidden className="flex items-center justify-end gap-1.5 text-caption text-muted">
        <span className="mr-1">Fewer</span>
        {HEAT_BG.map((bg) => (
          <span key={bg} className={cn("size-3 rounded-tag", bg)} />
        ))}
        <span className="ml-1">More</span>
      </div>
    </div>
  );
}
