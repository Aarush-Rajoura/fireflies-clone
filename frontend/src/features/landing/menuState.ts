// Pure state machine for the nav mega-menus, kept framework-free so it can be unit tested.

export interface MenuState {
  /** Id of the open mega-menu, or null when all are closed. */
  openId: string | null;
  /** Index of the focused item inside the open panel; -1 means focus stays on the trigger. */
  activeIndex: number;
}

export type MenuAction =
  | { type: "open"; id: string; focus?: "first" | "last" | "none"; count?: number }
  | { type: "close" }
  | { type: "toggle"; id: string }
  | { type: "move"; delta: 1 | -1; count: number }
  | { type: "focusIndex"; index: number; count: number };

export const initialMenuState: MenuState = { openId: null, activeIndex: -1 };

export function menuReducer(state: MenuState, action: MenuAction): MenuState {
  switch (action.type) {
    case "open": {
      const last = Math.max((action.count ?? 1) - 1, 0);
      const activeIndex = action.focus === "first" ? 0 : action.focus === "last" ? last : -1;
      return { openId: action.id, activeIndex };
    }
    case "close":
      return initialMenuState;
    case "toggle":
      return state.openId === action.id ? initialMenuState : { openId: action.id, activeIndex: -1 };
    case "move": {
      if (state.openId === null || action.count <= 0) return state;
      // From the trigger (-1), Down lands on the first item and Up on the last.
      const from = state.activeIndex < 0 ? (action.delta === 1 ? -1 : 0) : state.activeIndex;
      const next = (from + action.delta + action.count) % action.count;
      return { ...state, activeIndex: next };
    }
    case "focusIndex": {
      if (state.openId === null || action.count <= 0) return state;
      const clamped = Math.min(Math.max(action.index, 0), action.count - 1);
      return { ...state, activeIndex: clamped };
    }
  }
}

/**
 * Translate a key press into a menu action.
 * `where` says whether the key arrived on a trigger button or on an item inside the panel.
 * Returns `restoreFocus: true` when focus must go back to the trigger (Escape).
 */
export function menuKeyAction(
  key: string,
  where: "trigger" | "item",
  ctx: { id: string; openId: string | null; count: number },
): { action: MenuAction; restoreFocus?: boolean } | null {
  const isOpen = ctx.openId === ctx.id;
  if (key === "Escape") {
    return isOpen ? { action: { type: "close" }, restoreFocus: true } : null;
  }
  if (where === "trigger") {
    // Enter/Space toggle like a disclosure button; arrows always dive into the panel.
    if ((key === "Enter" || key === " ") && isOpen) return { action: { type: "close" } };
    if (key === "Enter" || key === " " || key === "ArrowDown") {
      return { action: { type: "open", id: ctx.id, focus: "first" } };
    }
    if (key === "ArrowUp")
      return { action: { type: "open", id: ctx.id, focus: "last", count: ctx.count } };
    return null;
  }
  if (!isOpen) return null;
  switch (key) {
    case "ArrowDown":
    case "ArrowRight":
      return { action: { type: "move", delta: 1, count: ctx.count } };
    case "ArrowUp":
    case "ArrowLeft":
      return { action: { type: "move", delta: -1, count: ctx.count } };
    case "Home":
      return { action: { type: "focusIndex", index: 0, count: ctx.count } };
    case "End":
      return { action: { type: "focusIndex", index: ctx.count - 1, count: ctx.count } };
    default:
      return null;
  }
}

/** A click this soon after a hover-open is the same gesture, so it must not toggle the menu shut. */
export const HOVER_CLICK_GRACE_MS = 400;

/**
 * Action for a pointer/AT click on a trigger. Every click counts (screen readers and
 * el.click() report detail === 0); keyboard Enter/Space never get here because the
 * keydown handler prevents their default click.
 */
export function triggerClickAction(
  id: string,
  openId: string | null,
  msSinceHoverOpen: number,
): MenuAction | null {
  if (openId === id && msSinceHoverOpen < HOVER_CLICK_GRACE_MS) return null;
  return { type: "toggle", id };
}
