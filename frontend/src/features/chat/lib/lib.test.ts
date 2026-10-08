import { describe, expect, it } from "vitest";

import type { ChatThread } from "@/lib/api";

import { chatCitationHref, groupByDay } from "./history";
import { parseBlocks, parseInline } from "./markdown";
import { activeTrigger, removeTrigger } from "./trigger";

describe("markdown-lite", () => {
  it("splits bold text and citation markers out of a line", () => {
    expect(parseInline("Ship it — **Arjun** · due Fri [2]")).toEqual([
      { kind: "text", text: "Ship it — " },
      { kind: "bold", text: "Arjun" },
      { kind: "text", text: " · due Fri " },
      { kind: "cite", n: 2 },
    ]);
  });

  it("parses headings, bullet lists and paragraphs", () => {
    const blocks = parseBlocks(
      "## Title [1]\nIntro line\nstill intro\n\n### Items\n- one\n- **two**\nAfter",
    );
    expect(blocks.map((b) => b.kind)).toEqual([
      "heading",
      "paragraph",
      "heading",
      "list",
      "paragraph",
    ]);
    expect(blocks[0]).toMatchObject({ level: 2 });
    expect(blocks[1]).toEqual({
      kind: "paragraph",
      inlines: [{ kind: "text", text: "Intro line still intro" }],
    });
    expect(blocks[2]).toMatchObject({ level: 3 });
    expect(blocks[3]).toEqual({
      kind: "list",
      items: [[{ kind: "text", text: "one" }], [{ kind: "bold", text: "two" }]],
    });
  });

  it("keeps HTML as plain text", () => {
    expect(parseInline("<img src=x onerror=alert(1)>")).toEqual([
      { kind: "text", text: "<img src=x onerror=alert(1)>" },
    ]);
  });
});

const thread = (id: number, updated_at: string): ChatThread => ({
  id,
  title: `t${id}`,
  meeting_id: null,
  created_at: updated_at,
  updated_at,
});

describe("history", () => {
  it("groups threads by the local day they were last active", () => {
    const now = new Date(2030, 0, 10, 15, 0);
    const groups = groupByDay(
      [
        thread(1, new Date(2030, 0, 10, 9, 0).toISOString()),
        thread(2, new Date(2030, 0, 9, 23, 0).toISOString()),
        thread(3, new Date(2029, 11, 30).toISOString()),
      ],
      now,
    );
    expect(groups.map((g) => [g.label, g.threads.map((t) => t.id)])).toEqual([
      ["Today", [1]],
      ["Yesterday", [2]],
      ["Earlier", [3]],
    ]);
    expect(groupByDay([], now)).toEqual([]);
  });

  it("links citations to the meeting at the moment, in seconds", () => {
    expect(chatCitationHref({ meeting_id: 4, start_ms: 90_500 })).toBe("/meetings/4?t=90.5");
    expect(chatCitationHref({ meeting_id: 4, start_ms: null })).toBe("/meetings/4");
  });
});

describe("composer triggers", () => {
  it("finds an @mention anywhere and a /skill only at the start", () => {
    expect(activeTrigger("summarize @hir", 14)).toEqual({
      kind: "mention",
      query: "hir",
      start: 10,
    });
    expect(activeTrigger("@", 1)).toEqual({ kind: "mention", query: "", start: 0 });
    expect(activeTrigger("/dig", 4)).toEqual({ kind: "skill", query: "dig", start: 0 });
    expect(activeTrigger("a /dig", 6)).toBeNull();
    expect(activeTrigger("mail me@x", 9)).toBeNull();
    expect(activeTrigger("@hiring done", 12)).toBeNull();
  });

  it("removes the token being typed", () => {
    const draft = "summarize @hir please";
    const trigger = activeTrigger(draft, 14)!;
    expect(removeTrigger(draft, trigger, 14)).toBe("summarize please");
    expect(removeTrigger("/dig", activeTrigger("/dig", 4)!, 4)).toBe("");
  });
});
