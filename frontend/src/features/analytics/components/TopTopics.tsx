import type { KeywordStat } from "@/lib/api";

import { fraction } from "../lib/scale";
import { ChartEmpty } from "./ChartCard";

const meetingsLabel = (n: number) => `${n} meeting${n === 1 ? "" : "s"}`;

/** Keywords ranked by how many meetings raised them; the bar shows their summed weight. */
export function TopTopics({ keywords }: { keywords: KeywordStat[] }) {
  if (keywords.length === 0) {
    return (
      <ChartEmpty>No topics yet. Summaries add keywords as meetings are processed.</ChartEmpty>
    );
  }
  const maxWeight = Math.max(...keywords.map((k) => k.weight));
  return (
    <ol className="flex flex-col gap-3">
      {keywords.map((k, i) => (
        <li
          key={k.term}
          className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-3"
        >
          <span className="tnum text-meta text-muted">{i + 1}</span>
          <div className="min-w-0">
            <div className="truncate text-body-strong text-primary">{k.term}</div>
            <div
              aria-hidden
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3"
              title={`Weight ${k.weight}`}
            >
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.max(fraction(k.weight, maxWeight), 0.02) * 100}%` }}
              />
            </div>
          </div>
          <span className="tnum text-meta text-muted">{meetingsLabel(k.meetings)}</span>
        </li>
      ))}
    </ol>
  );
}
