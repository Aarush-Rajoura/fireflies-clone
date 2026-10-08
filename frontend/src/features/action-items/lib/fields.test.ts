import { describe, expect, it } from "vitest";

import { assigneeOptions, isCompleteDate } from "./fields";

describe("assignee options", () => {
  it("keeps a current assignee who is not among the participants", () => {
    const opts = assigneeOptions([{ id: 1, display_name: "Sarah" }], { id: 7, display_name: "Ex" });
    expect(opts.map((o) => o.label)).toEqual(["Unassigned", "Sarah", "Ex"]);
    expect(
      assigneeOptions([{ id: 1, display_name: "Sarah" }], { id: 1, display_name: "Sarah" }),
    ).toHaveLength(2);
  });
});

describe("isCompleteDate", () => {
  it("accepts full dates and rejects half-typed years", () => {
    expect(isCompleteDate("2026-10-12")).toBe(true);
    expect(isCompleteDate("0002-10-12")).toBe(false);
    expect(isCompleteDate("2026-10")).toBe(false);
    expect(isCompleteDate("")).toBe(false);
  });
});
