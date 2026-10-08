import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LIVE_DEMO_WINDOW_MS, LiveDemoNotice, isJoiningPhase } from "./LiveDemoNotice";

afterEach(() => vi.useRealTimers());

describe("LiveDemoNotice", () => {
  it("knows the joining window", () => {
    const start = "2026-10-08T12:00:00Z";
    const t0 = Date.parse(start);
    expect(isJoiningPhase(start, t0)).toBe(true);
    expect(isJoiningPhase(start, t0 + LIVE_DEMO_WINDOW_MS - 1)).toBe(true);
    expect(isJoiningPhase(start, t0 + LIVE_DEMO_WINDOW_MS)).toBe(false);
  });

  it("says Fred is joining, then that the bot cannot join in the demo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T12:00:10Z"));
    render(<LiveDemoNotice startedAt="2026-10-08T12:00:00Z" />);
    expect(screen.getByRole("status").textContent).toContain("Fred is joining… (demo)");
    act(() => {
      vi.advanceTimersByTime(LIVE_DEMO_WINDOW_MS);
    });
    expect(screen.getByRole("status").textContent).toContain("Bot can't join in the demo");
  });
});
