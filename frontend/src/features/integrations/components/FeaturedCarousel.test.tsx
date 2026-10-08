import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui";

import { FeaturedCarousel } from "./FeaturedCarousel";

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

function renderCarousel() {
  render(
    <TooltipProvider>
      <FeaturedCarousel byKey={new Map()} onConnect={vi.fn()} onBrowse={vi.fn()} />
    </TooltipProvider>,
  );
  return {
    region: screen.getByRole("region", { name: "Featured integrations" }),
    current: () => screen.getByRole("heading", { level: 2 }).textContent ?? "",
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("FeaturedCarousel", () => {
  it("auto-advances, but holds still while hovered", () => {
    mockReducedMotion(false);
    const { region, current } = renderCarousel();
    expect(current()).toContain("Meeting MCP");
    fireEvent.mouseEnter(region);
    act(() => vi.advanceTimersByTime(30_000));
    expect(current()).toContain("Meeting MCP");
    fireEvent.mouseLeave(region);
    act(() => vi.advanceTimersByTime(7_000));
    expect(current()).toContain("spreadsheets");
  });

  it("never rotates under reduced motion; prev/next still move", () => {
    mockReducedMotion(true);
    const { current } = renderCarousel();
    act(() => vi.advanceTimersByTime(30_000));
    expect(current()).toContain("Meeting MCP");
    fireEvent.click(screen.getByRole("button", { name: "Next featured integration" }));
    expect(current()).toContain("spreadsheets");
    fireEvent.click(screen.getByRole("button", { name: "Previous featured integration" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous featured integration" }));
    expect(current()).toContain("CRM");
  });
});
