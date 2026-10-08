import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AnalyticsOverview } from "@/lib/api";

import { ActivityHeatmap } from "./ActivityHeatmap";
import { AnalyticsEmpty } from "./AnalyticsEmpty";
import { MeetingsPerWeekChart } from "./MeetingsPerWeekChart";
import { SourcesBreakdown } from "./SourcesBreakdown";
import { StatTiles } from "./StatTiles";
import { TalkTimeChart } from "./TalkTimeChart";
import { TopTopics } from "./TopTopics";

const ZERO_TOTALS: AnalyticsOverview["totals"] = {
  meetings: 0,
  total_duration_ms: 0,
  avg_duration_ms: 0,
  unique_participants: 0,
  action_items_created: 0,
  action_items_completed: 0,
  completion_rate: 0,
};

describe("StatTiles", () => {
  it("shows zeros, not blanks or NaN, for an empty range", () => {
    render(<StatTiles totals={ZERO_TOTALS} />);
    expect(screen.getByText("Meetings").closest("div")?.textContent).toContain("0");
    expect(screen.getByText("0m")).toBeTruthy();
    expect(screen.getByText("0%")).toBeTruthy();
    expect(
      screen.getByRole("meter", { name: "Action item completion" }).getAttribute("aria-valuenow"),
    ).toBe("0");
    expect(document.body.textContent).not.toMatch(/NaN|undefined/);
  });

  it("formats real totals", () => {
    render(
      <StatTiles
        totals={{
          ...ZERO_TOTALS,
          meetings: 2,
          total_duration_ms: 90 * 60_000,
          avg_duration_ms: 45 * 60_000,
          action_items_created: 3,
          action_items_completed: 1,
          completion_rate: 1 / 3,
        }}
      />,
    );
    expect(screen.getByText("1h 30m")).toBeTruthy();
    expect(screen.getByText("45m on average")).toBeTruthy();
    expect(screen.getByText("33%")).toBeTruthy();
    expect(screen.getByText("1 of 3 items")).toBeTruthy();
  });
});

describe("MeetingsPerWeekChart", () => {
  it("exposes every week in a visually hidden table", () => {
    render(
      <MeetingsPerWeekChart
        weeks={[
          { week_start: "2026-09-28", meetings: 1 },
          { week_start: "2026-10-05", meetings: 0 },
        ]}
      />,
    );
    const table = screen.getByRole("table", { name: "Meetings per week" });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(rows[1]?.textContent).toContain("Sep 28, 2026");
    expect(rows[1]?.textContent).toContain("1");
  });
});

describe("TalkTimeChart", () => {
  it("gives each person a distinct colour and the Others row a neutral one", () => {
    const participants = [
      { name: "Sarah Chen", talk_ms: 60_000, share: 0.6, is_other: false },
      { name: "Raj", talk_ms: 30_000, share: 0.3, is_other: false },
      { name: "Others", talk_ms: 10_000, share: 0.1, is_other: true },
    ];
    render(<TalkTimeChart talk={{ total_ms: 100_000, participants }} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe(
      "Share of talk time: Sarah Chen 60%, Raj 30%, Others 10%.",
    );
    const swatches = screen
      .getAllByRole("listitem")
      .map((li) => li.querySelector("span")?.className ?? "");
    const colours = swatches.map((c) => c.match(/bg-[\w-]+/)?.[0]);
    expect(new Set(colours).size).toBe(3);
    expect(colours[2]).toBe("bg-skeleton");
  });

  it("explains an empty range instead of drawing an empty bar", () => {
    render(<TalkTimeChart talk={{ total_ms: 0, participants: [] }} />);
    expect(screen.getByText(/No transcribed talk time/)).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });
});

describe("TopTopics", () => {
  it("ranks topics with their meeting counts", () => {
    render(
      <TopTopics
        keywords={[
          { term: "Pricing", meetings: 2, weight: 1.3 },
          { term: "Hiring", meetings: 1, weight: 0.5 },
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]?.textContent).toContain("1Pricing2 meetings");
    expect(items[1]?.textContent).toContain("2Hiring1 meeting");
  });
});

describe("ActivityHeatmap", () => {
  it("summarises the busiest slot for assistive tech", () => {
    const heatmap = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
    heatmap[1]![10] = 3;
    render(<ActivityHeatmap activity={{ heatmap, busiest_weekday: 1, busiest_hour: 10 }} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe(
      "Meetings by weekday and hour. Busiest day: Tuesday; busiest hour: 10 AM.",
    );
    expect(screen.getByTitle("Tuesday 10 AM: 3 meetings").className).toContain("bg-heat-4");
    expect(screen.getByTitle("Monday 12 AM: 0 meetings").className).toContain("bg-heat-0");
  });
});

describe("SourcesBreakdown", () => {
  it("lists the largest source first", () => {
    render(
      <SourcesBreakdown
        sources={[
          { source: "seed", meetings: 1 },
          { source: "upload", meetings: 4 },
          { source: "paste", meetings: 0 },
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]?.textContent).toContain("Uploaded480%");
    expect(items[2]?.textContent).toContain("Pasted transcript00%");
  });
});

describe("AnalyticsEmpty", () => {
  it("offers a wider range", () => {
    const onShowAll = vi.fn();
    render(<AnalyticsEmpty range="7d" onShowAll={onShowAll} />);
    expect(screen.getByText("No meetings in the last 7 days")).toBeTruthy();
    screen.getByRole("button", { name: "Show all time" }).click();
    expect(onShowAll).toHaveBeenCalledOnce();
  });

  it("has nothing wider to offer for all time", () => {
    render(<AnalyticsEmpty range="all" onShowAll={() => {}} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
