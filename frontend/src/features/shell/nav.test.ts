import { describe, expect, it } from "vitest";

import { NAV_FOOTER, NAV_GROUPS, isActive, titleForPath } from "./nav";

describe("isActive", () => {
  it("matches the exact path and its sub-paths", () => {
    expect(isActive("/meetings", "/meetings")).toBe(true);
    expect(isActive("/meetings/42", "/meetings")).toBe(true);
    expect(isActive("/meetings/", "/meetings")).toBe(true);
  });

  it("does not match a sibling that merely shares a prefix", () => {
    expect(isActive("/meetingsx", "/meetings")).toBe(false);
    expect(isActive("/home", "/meetings")).toBe(false);
  });

  it("never marks an item without a route as active", () => {
    expect(isActive("/", undefined)).toBe(false);
  });

  it("lights exactly one rail item per routed page", () => {
    const items = [...NAV_GROUPS.flat(), ...NAV_FOOTER];
    for (const path of [
      "/home",
      "/askfred",
      "/meetings/3",
      "/tasks",
      "/apps",
      "/analytics",
      "/team",
      "/integrations",
      "/settings",
    ]) {
      expect(items.filter((item) => isActive(path, item.href))).toHaveLength(1);
    }
  });
});

describe("titleForPath", () => {
  it("uses the rail label or a known page name", () => {
    expect(titleForPath("/meetings/9")).toBe("Meetings");
    expect(titleForPath("/askfred")).toBe("AskFred");
    expect(titleForPath("/search")).toBe("Search");
    expect(titleForPath("/team")).toBe("Team");
    expect(titleForPath("/unknown")).toBe("");
  });
});
