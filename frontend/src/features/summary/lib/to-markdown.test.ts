import { describe, expect, it } from "vitest";

import type { Summary } from "@/lib/api";

import { escapeMd, summaryToMarkdown } from "./to-markdown";

const summary: Summary = {
  overview: "The team agreed on a rollout plan.",
  keywords: ["rollout", "training"],
  outline: [
    { title: "Use Case & Requirements", start_ms: 0 },
    { title: "Next Steps", start_ms: 612_000 },
  ],
  notes: [
    { title: "Use Case & Requirements", bullets: ["50 users", "Weekly calls"] },
    { title: "Next Steps", bullets: ["Send list"] },
  ],
  provider: "mock",
  model: null,
  generated_at: "2026-10-08T10:00:00Z",
  is_stale: false,
};

describe("summaryToMarkdown", () => {
  it("renders sections in canonical order with time-ranged chapters", () => {
    expect(summaryToMarkdown(summary, { title: "Kickoff", durationMs: 900_000 })).toBe(
      [
        "# Kickoff",
        "",
        "## Keywords",
        "",
        "rollout · training",
        "",
        "## Meeting Overview",
        "",
        "The team agreed on a rollout plan.",
        "",
        "## Meeting Outline",
        "",
        "- `00:00` Use Case & Requirements",
        "- `10:12` Next Steps",
        "",
        "## Bullet-Point Notes",
        "",
        "### Use Case & Requirements: 00:00 – 10:12",
        "",
        "- 50 users",
        "- Weekly calls",
        "",
        "### Next Steps: 10:12 – 15:00",
        "",
        "- Send list",
        "",
      ].join("\n"),
    );
  });

  it("escapes markdown syntax and folds newlines inside bullets and titles", () => {
    expect(escapeMd("a *b* _c_ `d` [e](f) #g \\h")).toBe(
      "a \\*b\\* \\_c\\_ \\`d\\` \\[e\\](f) \\#g \\\\h",
    );
    const md = summaryToMarkdown(
      { ...summary, keywords: [], outline: [], notes: [{ title: "#1", bullets: ["line\nbreak"] }] },
      { durationMs: 0 },
    );
    expect(md).toContain("### \\#1\n\n- line break");
  });

  it("follows the template and omits empty sections", () => {
    const md = summaryToMarkdown(
      { ...summary, keywords: [], outline: [] },
      { durationMs: 0, template: "one-on-one" },
    );
    expect(md.startsWith("## Check-in\n\nThe team")).toBe(true);
    expect(md).toContain("## Talking Points");
    expect(md).not.toContain("Keywords");
    expect(md).toContain("### Next Steps\n");
  });
});
