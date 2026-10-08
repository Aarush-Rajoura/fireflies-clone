import { describe, expect, it } from "vitest";

import { describeDueDate } from "./due-date";

// Local times: due dates are calendar dates in the viewer's zone.
const at = (y: number, m: number, d: number, h = 12, min = 0, s = 0) =>
  new Date(y, m - 1, d, h, min, s);

describe("describeDueDate", () => {
  it("returns nothing without a valid date", () => {
    expect(describeDueDate(null)).toBeNull();
    expect(describeDueDate("not-a-date")).toBeNull();
  });

  it("labels today, tomorrow, later and overdue", () => {
    const now = at(2026, 10, 8);
    expect(describeDueDate("2026-10-08", now)).toEqual({ tone: "today", label: "Due today" });
    expect(describeDueDate("2026-10-09", now)).toEqual({ tone: "tomorrow", label: "Due tomorrow" });
    expect(describeDueDate("2026-10-12", now)).toEqual({ tone: "upcoming", label: "Due Oct 12" });
    expect(describeDueDate("2026-10-07", now)).toEqual({ tone: "overdue", label: "Overdue" });
    expect(describeDueDate("2027-01-03", now)?.label).toBe("Due Jan 3, 2027");
  });

  it("flips exactly at local midnight", () => {
    expect(describeDueDate("2026-10-08", at(2026, 10, 8, 23, 59, 59))?.label).toBe("Due today");
    expect(describeDueDate("2026-10-08", at(2026, 10, 9, 0, 0, 0))?.label).toBe("Overdue");
    expect(describeDueDate("2026-10-09", at(2026, 10, 8, 23, 59, 59))?.label).toBe("Due tomorrow");
    expect(describeDueDate("2026-10-09", at(2026, 10, 9, 0, 0, 1))?.label).toBe("Due today");
    expect(describeDueDate("2026-10-08", at(2026, 10, 8, 0, 0, 0))?.label).toBe("Due today");
  });
});
