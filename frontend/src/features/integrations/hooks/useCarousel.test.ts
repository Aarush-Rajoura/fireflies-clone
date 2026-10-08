import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCarousel } from "./useCarousel";

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useCarousel", () => {
  it("advances on a timer and wraps around", () => {
    mockReducedMotion(false);
    const { result } = renderHook(() => useCarousel(3, 1000));
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.index).toBe(1);
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.index).toBe(0);
  });

  it("pauses while hovered and resumes after", () => {
    mockReducedMotion(false);
    const { result } = renderHook(() => useCarousel(3, 1000));
    act(() => result.current.pauseHandlers.onMouseEnter());
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.index).toBe(0);
    expect(result.current.paused).toBe(true);
    act(() => result.current.pauseHandlers.onMouseLeave());
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.index).toBe(1);
  });

  it("never rotates for reduced motion, but the dots still work", () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => useCarousel(3, 1000));
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.index).toBe(0);
    act(() => result.current.goTo(2));
    expect(result.current.index).toBe(2);
  });
});
