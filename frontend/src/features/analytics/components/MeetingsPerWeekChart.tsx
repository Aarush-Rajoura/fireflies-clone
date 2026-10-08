"use client";

import { useId } from "react";

import type { AnalyticsOverview } from "@/lib/api";

import { useElementWidth } from "../hooks/useElementWidth";
import { formatWeek } from "../lib/format";
import { labelStride, linearScale, niceTicks } from "../lib/scale";

type Week = AnalyticsOverview["meetings_per_week"][number];

const HEIGHT = 200;
const MARGIN = { top: 16, right: 4, bottom: 24, left: 28 };
const MAX_BAR = 36;
const RADIUS = 4;
/** Above this many weeks per-bar value labels would collide, so only the tooltip carries them. */
const MAX_VALUE_LABELS = 14;

/** A bar with rounded top corners only, so it stays anchored to the baseline. */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(RADIUS, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

const weekLabel = (w: Week) => `Week of ${formatWeek(w.week_start, true)}`;
const meetingsLabel = (n: number) => `${n} meeting${n === 1 ? "" : "s"}`;

export function MeetingsPerWeekChart({ weeks }: { weeks: Week[] }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const titleId = useId();
  const max = Math.max(0, ...weeks.map((w) => w.meetings));
  const ticks = niceTicks(max, 4);
  const top = ticks[ticks.length - 1] ?? 1;
  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const y = linearScale([0, top], [MARGIN.top + innerH, MARGIN.top]);
  const band = weeks.length ? innerW / weeks.length : 0;
  // Leave at least 2px of surface between neighbouring bars.
  const barW = Math.max(2, Math.min(MAX_BAR, band * 0.62, band - 2));
  const stride = labelStride(weeks.length, Math.max(1, Math.floor(innerW / 64)));
  const showValues = weeks.length <= MAX_VALUE_LABELS;
  const total = weeks.reduce((sum, w) => sum + w.meetings, 0);
  const summary = `Meetings per week: ${meetingsLabel(total)} over ${weeks.length} week${weeks.length === 1 ? "" : "s"}, at most ${max} in one week.`;

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={width} height={HEIGHT} role="img" aria-labelledby={titleId} className="block">
          <title id={titleId}>{summary}</title>
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(t)}
                y2={y(t)}
                className={t === 0 ? "stroke-current text-muted" : "stroke-divider"}
                strokeDasharray={t === 0 ? undefined : "2 4"}
              />
              <text
                x={MARGIN.left - 8}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="tnum fill-current text-caption text-muted"
              >
                {t}
              </text>
            </g>
          ))}
          {weeks.map((w, i) => {
            const x = MARGIN.left + i * band;
            const h = y(0) - y(w.meetings);
            return (
              <g key={w.week_start} className="group">
                <title>{`${weekLabel(w)}: ${meetingsLabel(w.meetings)}`}</title>
                {/* Full-height hit target, bigger than the bar, that also shows the hover wash. */}
                <rect
                  x={x}
                  y={MARGIN.top}
                  width={band}
                  height={innerH}
                  className="fill-transparent group-hover:fill-surface-hover"
                />
                {w.meetings > 0 && (
                  <path
                    d={barPath(x + (band - barW) / 2, y(w.meetings), barW, h)}
                    className="fill-accent transition-colors duration-fast group-hover:fill-accent-hover"
                  />
                )}
                {showValues && w.meetings > 0 && (
                  <text
                    x={x + band / 2}
                    y={y(w.meetings) - 6}
                    textAnchor="middle"
                    className="tnum fill-current text-caption text-secondary"
                  >
                    {w.meetings}
                  </text>
                )}
                {i % stride === 0 && (
                  <text
                    x={x + band / 2}
                    y={HEIGHT - 6}
                    textAnchor="middle"
                    className="fill-current text-caption text-muted"
                  >
                    {formatWeek(w.week_start)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      <table className="sr-only">
        <caption>Meetings per week</caption>
        <thead>
          <tr>
            <th scope="col">Week starting</th>
            <th scope="col">Meetings</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.week_start}>
              <th scope="row">{formatWeek(w.week_start, true)}</th>
              <td>{w.meetings}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
