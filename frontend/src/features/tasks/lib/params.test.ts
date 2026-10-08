import { describe, expect, it } from "vitest";

import { isFiltered, parseTasksParams, serializeTasksParams, toListQuery } from "./params";

const parse = (qs: string) => parseTasksParams(new URLSearchParams(qs));

describe("tasks params", () => {
  it("defaults to My Tasks, every status, no due filter", () => {
    expect(parse("")).toEqual({ scope: "mine", status: "all", due: undefined, q: undefined });
    expect(serializeTasksParams(parse(""))).toBe("");
  });

  it("round-trips every parameter in a stable order", () => {
    const qs = "due=week&q=deck&scope=all&status=open";
    expect(serializeTasksParams(parse(qs))).toBe(qs);
  });

  it("ignores junk instead of sending it to the server", () => {
    expect(parse("scope=team&status=done&due=someday&q=%20")).toEqual({
      scope: "mine",
      status: "all",
      due: undefined,
      q: undefined,
    });
  });

  it("knows when filters are hiding tasks", () => {
    expect(isFiltered(parse("scope=all"))).toBe(false);
    expect(isFiltered(parse("status=open"))).toBe(true);
    expect(isFiltered(parse("due=today"))).toBe(true);
  });

  it("maps to the API query with the viewer's time zone", () => {
    expect(toListQuery(parse("status=completed&due=overdue"), "Asia/Kolkata")).toEqual({
      scope: "mine",
      status: "completed",
      due: "overdue",
      q: undefined,
      tz: "Asia/Kolkata",
    });
    expect(toListQuery(parse(""), "UTC").status).toBeUndefined();
  });
});
