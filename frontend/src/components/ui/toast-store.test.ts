import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  AUTO_DISMISS_MS,
  getToasts,
  MAX_VISIBLE,
  pause,
  resetToasts,
  resume,
  runAction,
  subscribe,
  toast,
} from "./toast-store";

describe("toast store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetToasts();
  });
  afterEach(() => {
    resetToasts();
    vi.useRealTimers();
  });

  test("adds toasts of each kind and notifies subscribers", () => {
    const listener = vi.fn();
    const off = subscribe(listener);
    toast.success("Saved");
    toast.info("Heads up");
    expect(getToasts().map((t) => [t.kind, t.message])).toEqual([
      ["success", "Saved"],
      ["info", "Heads up"],
    ]);
    expect(listener).toHaveBeenCalledTimes(2);
    off();
  });

  test("error with retry and undo carry an action", () => {
    const retry = vi.fn();
    const undo = vi.fn();
    toast.error("Failed", { retry });
    toast.undo("Deleted", undo);
    const [err, und] = getToasts();
    expect(err?.action?.label).toBe("Retry");
    expect(und?.action?.label).toBe("Undo");
    err?.action?.onClick();
    und?.action?.onClick();
    expect(retry).toHaveBeenCalledOnce();
    expect(undo).toHaveBeenCalledOnce();
  });

  test("dismiss removes a toast", () => {
    const id = toast.success("One");
    toast.success("Two");
    toast.dismiss(id);
    expect(getToasts().map((t) => t.message)).toEqual(["Two"]);
  });

  test("auto-expires after 5s", () => {
    toast.success("Bye");
    vi.advanceTimersByTime(AUTO_DISMISS_MS - 1);
    expect(getToasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(getToasts()).toHaveLength(0);
  });

  test("pause freezes the countdown and resume continues it", () => {
    const id = toast.success("Hover me");
    vi.advanceTimersByTime(3000);
    pause(id);
    vi.advanceTimersByTime(10_000);
    expect(getToasts()).toHaveLength(1);
    resume(id);
    vi.advanceTimersByTime(1999);
    expect(getToasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(getToasts()).toHaveLength(0);
  });

  test("an action that throws still dismisses its toast", () => {
    toast.error("Failed", {
      retry: () => {
        throw new Error("boom");
      },
    });
    const [item] = getToasts();
    expect(item).toBeDefined();
    expect(() => runAction(item!)).toThrow("boom");
    expect(getToasts()).toHaveLength(0);
  });

  test("keeps at most 3 visible, dropping the oldest", () => {
    ["a", "b", "c", "d"].forEach((m) => toast.info(m));
    expect(MAX_VISIBLE).toBe(3);
    expect(getToasts().map((t) => t.message)).toEqual(["b", "c", "d"]);
  });
});
