import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui";

import { FindBar, type FindBarProps } from "./FindBar";

function renderBar(props: Partial<FindBarProps> = {}) {
  const handlers = {
    onQueryChange: vi.fn(),
    onNext: vi.fn(),
    onPrev: vi.fn(),
    onClose: vi.fn(),
  };
  render(
    <TooltipProvider>
      <FindBar query="pricing" total={11} current={2} {...handlers} {...props} />
    </TooltipProvider>,
  );
  return { ...handlers, input: screen.getByRole("searchbox", { name: "Search transcript" }) };
}

describe("FindBar", () => {
  it('shows "n of m" for the current match', () => {
    renderBar();
    expect(screen.getByRole("status").textContent).toBe("3 of 11");
  });

  it("shows the total before a match is chosen", () => {
    renderBar({ current: -1 });
    expect(screen.getByRole("status").textContent).toBe("11 results");
  });

  it("disables stepping when nothing matches", () => {
    renderBar({ total: 0, current: -1 });
    expect(screen.getByRole("status").textContent).toBe("No results");
    expect(screen.getByRole("button", { name: "Next match" }).hasAttribute("disabled")).toBe(true);
  });

  it("hides the counter and arrows for an empty query", () => {
    renderBar({ query: "", total: 0, current: -1 });
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("button", { name: "Next match" })).toBeNull();
  });

  it("steps with Enter / Shift+Enter and the arrow keys", () => {
    const { input, onNext, onPrev } = renderBar();
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(onNext).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(onPrev).toHaveBeenCalledTimes(2);
  });

  it("steps with the buttons", () => {
    const { onNext, onPrev } = renderBar();
    fireEvent.click(screen.getByRole("button", { name: "Next match" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous match" }));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", () => {
    const { input, onClose, onQueryChange } = renderBar();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    // The panel's onClose clears the query; the input's own Escape-clear is suppressed.
    expect(onQueryChange).not.toHaveBeenCalled();
  });

  it("reports typing", () => {
    const { input, onQueryChange } = renderBar({ query: "" });
    fireEvent.change(input, { target: { value: "café" } });
    expect(onQueryChange).toHaveBeenCalledWith("café");
  });
});
