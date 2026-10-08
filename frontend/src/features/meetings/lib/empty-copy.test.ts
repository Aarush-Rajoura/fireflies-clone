import { describe, expect, it } from "vitest";

import { emptyCopy } from "./empty-copy";
import { parseMeetingsParams } from "./params";

const view = (search: string, channelName?: string) =>
  emptyCopy(parseMeetingsParams(new URLSearchParams(search)), channelName);

describe("emptyCopy", () => {
  it("only claims a first run for unfiltered All Meetings", () => {
    expect(view("").kind).toBe("first-run");
    expect(view("").title).toBe("Looks like you haven't recorded a meeting yet");
  });

  it("names the view that is empty", () => {
    expect(view("channel=2", "Product").title).toBe("No meetings in #Product yet");
    expect(view("scope=shared").title).toBe("Nothing shared with you yet");
    expect(view("scope=uploads").kind).toBe("uploads");
    expect(view("scope=hosted").kind).toBe("hosted");
  });

  it("puts a search or filter first, since clearing it is the fix", () => {
    expect(view("q=zzzz&scope=shared").title).toBe("No meetings match “zzzz”");
    expect(view("participant=ada&channel=2", "Product").kind).toBe("filtered");
  });
});
