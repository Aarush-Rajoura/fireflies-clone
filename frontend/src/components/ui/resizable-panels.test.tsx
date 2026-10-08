import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { clampSize, readStoredSize, ResizablePanels } from "./resizable-panels";

afterEach(() => window.localStorage.clear());

describe("clampSize", () => {
  test("clamps into [min, max] and rejects non-numbers", () => {
    expect(clampSize(10, 20, 80)).toBe(20);
    expect(clampSize(95, 20, 80)).toBe(80);
    expect(clampSize(42, 20, 80)).toBe(42);
    expect(clampSize(Number.NaN, 20, 80)).toBe(20);
  });
});

describe("ResizablePanels", () => {
  const setup = (props: Partial<Parameters<typeof ResizablePanels>[0]> = {}) =>
    render(
      <ResizablePanels start="A" end="B" minSize={20} maxSize={80} defaultSize={50} {...props} />,
    );
  const sep = () => screen.getByRole("separator");

  test("each pane is a bounded, positioned scroller so absolute children cannot stretch the page", () => {
    setup();
    for (const text of ["A", "B"]) {
      const pane = screen.getByText(text);
      expect(pane.className).toContain("relative");
      expect(pane.className).toContain("min-h-0");
      expect(pane.className).toContain("overflow-auto");
    }
  });

  test("keyboard resizes in steps and stops at the limits", () => {
    setup({ step: 10 });
    fireEvent.keyDown(sep(), { key: "ArrowRight" });
    expect(sep().getAttribute("aria-valuenow")).toBe("60");
    fireEvent.keyDown(sep(), { key: "End" });
    expect(sep().getAttribute("aria-valuenow")).toBe("80");
    fireEvent.keyDown(sep(), { key: "ArrowRight" });
    expect(sep().getAttribute("aria-valuenow")).toBe("80");
    fireEvent.keyDown(sep(), { key: "Home" });
    fireEvent.keyDown(sep(), { key: "ArrowLeft" });
    expect(sep().getAttribute("aria-valuenow")).toBe("20");
  });

  test("an out-of-range default is clamped", () => {
    setup({ defaultSize: 5 });
    expect(sep().getAttribute("aria-valuenow")).toBe("20");
  });

  test("persists and restores the size, clamping stored values", () => {
    const { unmount } = setup({ storageKey: "split" });
    fireEvent.keyDown(sep(), { key: "ArrowRight" });
    expect(window.localStorage.getItem("split")).toBe("52");
    unmount();
    window.localStorage.setItem("split", "999");
    setup({ storageKey: "split" });
    expect(sep().getAttribute("aria-valuenow")).toBe("80");
  });

  test("dragging resizes live but persists only on release or cancel", () => {
    setup({ storageKey: "split" });
    const container = sep().parentElement as HTMLElement;
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
      left: 0,
      width: 1000,
    } as DOMRect);
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    fireEvent.pointerDown(sep(), { pointerId: 1, clientX: 500 });
    fireEvent.pointerMove(sep(), { pointerId: 1, clientX: 300 });
    expect(sep().getAttribute("aria-valuenow")).toBe("30");
    fireEvent.pointerMove(sep(), { pointerId: 1, clientX: 50 });
    expect(sep().getAttribute("aria-valuenow")).toBe("20");
    expect(setItem).not.toHaveBeenCalled();
    fireEvent.pointerUp(sep(), { pointerId: 1, clientX: 50 });
    expect(window.localStorage.getItem("split")).toBe("20");

    fireEvent.pointerDown(sep(), { pointerId: 2, clientX: 200 });
    fireEvent.pointerMove(sep(), { pointerId: 2, clientX: 400 });
    fireEvent.pointerCancel(sep(), { pointerId: 2 });
    expect(window.localStorage.getItem("split")).toBe("40");
    // Moves after the drag ended are ignored.
    fireEvent.pointerMove(sep(), { pointerId: 2, clientX: 700 });
    expect(sep().getAttribute("aria-valuenow")).toBe("40");
  });

  test("storage failures are swallowed", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(readStoredSize("split")).toBeUndefined();
    setup({ storageKey: "split" });
    expect(() => fireEvent.keyDown(sep(), { key: "ArrowLeft" })).not.toThrow();
    expect(sep().getAttribute("aria-valuenow")).toBe("48");
  });
});
