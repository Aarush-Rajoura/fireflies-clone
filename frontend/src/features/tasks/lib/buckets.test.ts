import { describe, expect, it } from "vitest";

import type { ActionItem } from "@/lib/api";

import { dueBucket, groupTasks } from "./buckets";

// Local time, like the user's clock: Thursday Oct 8, 23:30.
const NOW = new Date(2026, 9, 8, 23, 30);

const task = (id: number, due_date: string | null, status: ActionItem["status"] = "open") =>
  ({
    id,
    meeting_id: null,
    meeting: null,
    text: `t${id}`,
    status,
    assignee: null,
    assignee_user: null,
    due_date,
    completed_at: null,
    source: "manual",
    start_ms: null,
  }) satisfies ActionItem;

describe("dueBucket", () => {
  it.each([
    ["2026-10-07", "overdue"],
    ["2026-10-08", "today"],
    ["2026-10-09", "week"],
    ["2026-10-14", "week"],
    ["2026-10-15", "later"],
    [null, "none"],
    ["not-a-date", "none"],
  ] as const)("%s is %s late in the evening", (due, bucket) => {
    expect(dueBucket(due, NOW)).toBe(bucket);
  });

  it("rolls over at local midnight, not UTC midnight", () => {
    const justAfter = new Date(2026, 9, 9, 0, 5);
    expect(dueBucket("2026-10-08", justAfter)).toBe("overdue");
    expect(dueBucket("2026-10-09", justAfter)).toBe("today");
  });
});

describe("groupTasks", () => {
  it("orders groups, drops empty ones and puts completed tasks last", () => {
    const groups = groupTasks(
      [
        task(1, null),
        task(2, "2026-10-01"),
        task(3, "2026-10-01", "completed"),
        task(4, "2026-10-08"),
        task(5, "2026-12-01"),
      ],
      NOW,
    );
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ["Overdue", [2]],
      ["Today", [4]],
      ["Later", [5]],
      ["No date", [1]],
      ["Completed", [3]],
    ]);
  });
});
