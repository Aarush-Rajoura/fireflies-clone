import { describe, expect, test } from "vitest";
import { scriptedReply } from "./chatScript";
import { CHAT_FALLBACK, CHAT_QUICK_REPLIES, SUMMARY_TABS } from "./content";
import { initialMenuState, menuKeyAction, menuReducer, type MenuState } from "./menuState";
import { findSummaryTab, nextTabIndex } from "./tabsState";

/** Feed a key into the reducer the way MarketingNav does. */
function press(state: MenuState, key: string, where: "trigger" | "item", id = "product", count = 4) {
  const result = menuKeyAction(key, where, { id, openId: state.openId, count });
  return { state: result ? menuReducer(state, result.action) : state, restoreFocus: result?.restoreFocus ?? false };
}

describe("nav mega-menu keyboard behaviour", () => {
  test("Enter and Space on a trigger open the menu and focus the first item", () => {
    for (const key of ["Enter", " "]) {
      const { state } = press(initialMenuState, key, "trigger");
      expect(state).toEqual({ openId: "product", activeIndex: 0 });
    }
  });

  test("Enter on the trigger of an open menu closes it", () => {
    const open = { openId: "product", activeIndex: -1 };
    expect(press(open, "Enter", "trigger").state).toEqual(initialMenuState);
  });

  test("ArrowUp on a trigger opens with the last item focused", () => {
    expect(press(initialMenuState, "ArrowUp", "trigger").state).toEqual({ openId: "product", activeIndex: 3 });
  });

  test("Escape closes the menu and asks for focus to return to the trigger", () => {
    const open = { openId: "product", activeIndex: 2 };
    const fromItem = press(open, "Escape", "item");
    expect(fromItem.state).toEqual(initialMenuState);
    expect(fromItem.restoreFocus).toBe(true);
    expect(press(open, "Escape", "trigger").restoreFocus).toBe(true);
  });

  test("Escape does nothing when the menu is already closed", () => {
    expect(menuKeyAction("Escape", "trigger", { id: "product", openId: null, count: 4 })).toBeNull();
  });

  test("arrow keys move between items and wrap around", () => {
    let s: MenuState = { openId: "product", activeIndex: 0 };
    s = press(s, "ArrowDown", "item").state;
    expect(s.activeIndex).toBe(1);
    s = press(s, "ArrowRight", "item").state;
    expect(s.activeIndex).toBe(2);
    s = press(s, "ArrowDown", "item").state;
    s = press(s, "ArrowDown", "item").state;
    expect(s.activeIndex).toBe(0);
    s = press(s, "ArrowUp", "item").state;
    expect(s.activeIndex).toBe(3);
    s = press(s, "ArrowLeft", "item").state;
    expect(s.activeIndex).toBe(2);
  });

  test("Home and End jump to the first and last item", () => {
    const s = { openId: "product", activeIndex: 2 };
    expect(press(s, "Home", "item").state.activeIndex).toBe(0);
    expect(press(s, "End", "item").state.activeIndex).toBe(3);
  });

  test("hover/click toggle opens one menu at a time", () => {
    let s = menuReducer(initialMenuState, { type: "toggle", id: "product" });
    expect(s.openId).toBe("product");
    s = menuReducer(s, { type: "open", id: "integration" });
    expect(s).toEqual({ openId: "integration", activeIndex: -1 });
    s = menuReducer(s, { type: "toggle", id: "integration" });
    expect(s).toEqual(initialMenuState);
  });

  test("moving inside a closed menu is a no-op", () => {
    expect(menuReducer(initialMenuState, { type: "move", delta: 1, count: 4 })).toBe(initialMenuState);
  });
});

describe("summary tabs", () => {
  test("arrow keys cycle through the tabs", () => {
    const n = SUMMARY_TABS.length;
    expect(nextTabIndex(0, "ArrowRight", n)).toBe(1);
    expect(nextTabIndex(n - 1, "ArrowRight", n)).toBe(0);
    expect(nextTabIndex(0, "ArrowLeft", n)).toBe(n - 1);
    expect(nextTabIndex(2, "Home", n)).toBe(0);
    expect(nextTabIndex(0, "End", n)).toBe(n - 1);
    expect(nextTabIndex(0, "Enter", n)).toBeNull();
  });

  test("switching tabs swaps the panel content", () => {
    const overview = findSummaryTab("overview");
    const actions = findSummaryTab("actions");
    expect(overview.label).toBe("Overview");
    expect(actions.label).toBe("Action Items");
    expect(actions.items.every((i) => i.owner)).toBe(true);
    expect(overview.items[0]?.text).not.toBe(actions.items[0]?.text);
  });

  test("tabs are Overview, Bullet Points, Action Items, Custom Notes", () => {
    expect(SUMMARY_TABS.map((t) => t.label)).toEqual(["Overview", "Bullet Points", "Action Items", "Custom Notes"]);
  });
});

describe("support chat script", () => {
  test("matches keywords to the scripted answers", () => {
    expect(scriptedReply("What does the Pro plan cost?")).toBe(CHAT_QUICK_REPLIES[0]?.answer);
    expect(scriptedReply("Is it GDPR compliant?")).toBe(CHAT_QUICK_REPLIES[2]?.answer);
    expect(scriptedReply("tell me a joke")).toBe(CHAT_FALLBACK);
  });
});
