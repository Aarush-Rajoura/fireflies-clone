import { describe, expect, it } from "vitest";

import { hit } from "../testing/fixtures";
import { groupByMeeting, hitHref, searchHref } from "./group";

describe("groupByMeeting", () => {
  it("orders meetings by their best hit and keeps relevance order inside each group", () => {
    const a1 = hit({ meeting_id: 1, meeting_title: "A" });
    const b1 = hit({ meeting_id: 2, meeting_title: "B" });
    const a2 = hit({ meeting_id: 1, meeting_title: "A" });
    const c1 = hit({ meeting_id: 3, meeting_title: "C" });
    const b2 = hit({ meeting_id: 2, meeting_title: "B" });

    const groups = groupByMeeting([a1, b1, a2, c1, b2]);

    expect(groups.map((g) => [g.meetingId, g.title])).toEqual([
      [1, "A"],
      [2, "B"],
      [3, "C"],
    ]);
    expect(groups[0]?.hits).toEqual([a1, a2]);
    expect(groups[1]?.hits).toEqual([b1, b2]);
    expect(groups[2]?.hits).toEqual([c1]);
  });

  it("returns no groups for no hits", () => {
    expect(groupByMeeting([])).toEqual([]);
  });
});

describe("links", () => {
  it("deep-links a hit in seconds, which is what the player's ?t= expects", () => {
    expect(hitHref({ meeting_id: 2, start_ms: 754_000 })).toBe("/meetings/2?t=754");
    expect(hitHref({ meeting_id: 2, start_ms: 1_500 })).toBe("/meetings/2?t=1.5");
  });

  it("encodes the query for the results page", () => {
    expect(searchHref("  q3 & pricing ")).toBe("/search?q=q3%20%26%20pricing");
  });
});
