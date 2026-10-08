import { describe, expect, it } from "vitest";

import { meeting } from "../testing/fixtures";
import { attendeeLabel, attendeeNames, formatDuration } from "./format";

describe("header formatting", () => {
  it("reads host first as 'Name, +N'", () => {
    const names = attendeeNames(meeting);
    expect(names).toEqual(["Sarah Watts", "Janice", "Chris"]);
    expect(attendeeLabel(names)).toBe("Sarah Watts, +2");
    expect(attendeeLabel(["Solo"])).toBe("Solo");
  });

  it("formats durations", () => {
    expect(formatDuration(20_000)).toBe("< 1 min");
    expect(formatDuration(45 * 60_000)).toBe("45 min");
    expect(formatDuration(65 * 60_000)).toBe("1 h 05 min");
    expect(formatDuration(120 * 60_000)).toBe("2 h");
  });
});
