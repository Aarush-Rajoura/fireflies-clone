import { describe, expect, it } from "vitest";

import { qk } from "./query-keys";

describe("query keys", () => {
  it("returns structurally equal keys for equal inputs", () => {
    expect(qk.meetings.list({ q: "roadmap", page: 2 })).toEqual(
      qk.meetings.list({ q: "roadmap", page: 2 }),
    );
    expect(qk.meetings.detail(7)).toEqual(["meetings", 7]);
    expect(qk.transcript(7)).toEqual(["meetings", 7, "transcript"]);
    expect(qk.summary(7)).toEqual(["meetings", 7, "summary"]);
    expect(qk.actionItems(7)).toEqual(["meetings", 7, "action-items"]);
    expect(qk.search.query("q")).toEqual(["search", "q"]);
    expect(qk.search.page({ q: "q", page: 2 })).toEqual(["search", "q", { page: 2 }]);
    expect(qk.me()).toEqual(["me"]);
  });

  it("nests per-meeting keys under the meeting so one invalidation covers them", () => {
    const prefix = qk.meetings.detail(7);
    for (const key of [qk.transcript(7), qk.summary(7), qk.actionItems(7)]) {
      expect(key.slice(0, prefix.length)).toEqual([...prefix]);
    }
    expect(qk.meetings.list().slice(0, 2)).toEqual([...qk.meetings.lists()]);
    expect(qk.meetings.lists()[0]).toBe(qk.meetings.all[0]);
  });
});
