import { describe, expect, it } from "vitest";

import type { ActionItem } from "@/lib/api";

import { groupByAssignee } from "./group";

const item = (id: number, assignee: { id: number; display_name: string } | null): ActionItem => ({
  id,
  meeting_id: 1,
  meeting: null,
  assignee_user: null,
  text: `Item ${id}`,
  status: "open",
  source: "ai",
  start_ms: null,
  due_date: null,
  completed_at: null,
  assignee,
});

const sarah = { id: 10, display_name: "Sarah" };
const tom = { id: 11, display_name: "Tom" };

describe("groupByAssignee", () => {
  it("groups by person in first-appearance order with Unassigned last", () => {
    const groups = groupByAssignee([item(1, null), item(2, tom), item(3, sarah), item(4, tom)]);
    expect(groups.map((g) => g.name)).toEqual(["Tom", "Sarah", "Unassigned"]);
    expect(groups[0]?.items.map((i) => i.id)).toEqual([2, 4]);
    expect(groups[2]).toMatchObject({ assigneeId: null });
  });

  it("omits Unassigned when everyone has an owner and handles an empty list", () => {
    expect(groupByAssignee([item(1, sarah)]).map((g) => g.name)).toEqual(["Sarah"]);
    expect(groupByAssignee([])).toEqual([]);
  });
});
