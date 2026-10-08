import { describe, expect, it } from "vitest";

import { monogramFill, monogramLetters } from "./monogram";
import {
  PAGE_SIZE,
  parseIntegrationsParams,
  serializeIntegrationsParams,
  toListQuery,
} from "./params";

const parse = (qs: string) => parseIntegrationsParams(new URLSearchParams(qs));

describe("integrations URL params", () => {
  it("defaults to Discover with no filters", () => {
    expect(parse("")).toEqual({ tab: "discover", category: undefined, q: undefined });
  });

  it("reads a deep link such as the Tasks banner's", () => {
    expect(parse("category=project-management")).toMatchObject({
      tab: "discover",
      category: "project-management",
    });
    expect(parse("tab=connected&q=%20slack%20")).toEqual({
      tab: "connected",
      category: undefined,
      q: "slack",
    });
  });

  it("drops unknown values instead of sending them", () => {
    expect(parse("tab=nope&category=fax&q=%20%20")).toEqual({
      tab: "discover",
      category: undefined,
      q: undefined,
    });
  });

  it("round-trips and omits defaults", () => {
    expect(serializeIntegrationsParams({ tab: "discover" })).toBe("");
    const params = { tab: "connected", category: "crm", q: "hub" } as const;
    expect(parse(serializeIntegrationsParams(params))).toEqual(params);
  });

  it("filters Discover only; Connected lists every connection", () => {
    expect(toListQuery({ tab: "discover", category: "crm", q: "hub" })).toEqual({
      page_size: PAGE_SIZE,
      category: "crm",
      q: "hub",
    });
    expect(toListQuery({ tab: "connected", category: "crm", q: "hub" })).toEqual({
      connected: true,
      page_size: PAGE_SIZE,
    });
  });
});

describe("monogram", () => {
  it("uses one letter per word, at most two", () => {
    expect(monogramLetters("HubSpot")).toBe("H");
    expect(monogramLetters("Google Meet")).toBe("GM");
    expect(monogramLetters("Meeting MCP for AI assistants")).toBe("MM");
  });

  it("keeps a stable fill per key", () => {
    expect(monogramFill("slack")).toBe(monogramFill("slack"));
    expect(monogramFill("slack")).toMatch(/^bg-avatar-[0-7]$/);
  });
});
