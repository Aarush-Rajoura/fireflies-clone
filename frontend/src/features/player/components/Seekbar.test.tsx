import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VirtualClockEngine } from "../engines/virtual-clock-engine";
import { PlayerProvider } from "../PlayerProvider";
import { installFakePlayerTimers } from "../testing/fake-timers";
import { Seekbar } from "./Seekbar";

function renderSeekbar(durationMs = 2_538_000) {
  render(
    <PlayerProvider durationMs={durationMs} createEngine={(a) => new VirtualClockEngine(a)}>
      <Seekbar />
    </PlayerProvider>,
  );
  return screen.getByRole("slider", { name: "Seek" });
}

describe("Seekbar", () => {
  beforeEach(() => installFakePlayerTimers());
  afterEach(() => vi.useRealTimers());

  it("exposes slider semantics with a spoken time", () => {
    const slider = renderSeekbar();
    expect(slider).toHaveProperty("tabIndex", 0);
    expect(slider.getAttribute("aria-valuemin")).toBe("0");
    expect(slider.getAttribute("aria-valuemax")).toBe("2538000");
    expect(slider.getAttribute("aria-valuetext")).toBe("0:00 of 42:18");
  });

  it("steps 5s with arrows and jumps with Home/End", () => {
    const slider = renderSeekbar();
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider.getAttribute("aria-valuenow")).toBe("10000");
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(slider.getAttribute("aria-valuetext")).toBe("0:05 of 42:18");
    fireEvent.keyDown(slider, { key: "End" });
    expect(slider.getAttribute("aria-valuenow")).toBe("2538000");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider.getAttribute("aria-valuenow")).toBe("2538000");
    fireEvent.keyDown(slider, { key: "Home" });
    expect(slider.getAttribute("aria-valuenow")).toBe("0");
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(slider.getAttribute("aria-valuenow")).toBe("0");
  });

  it("seeks to the clicked position", () => {
    const slider = renderSeekbar(100_000);
    slider.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 16 }) as DOMRect;
    fireEvent.pointerDown(slider, { button: 0, clientX: 50, pointerId: 1 });
    // Preview only while the pointer is down.
    expect(slider.getAttribute("aria-valuenow")).toBe("25000");
    fireEvent.pointerMove(slider, { clientX: 100, pointerId: 1 });
    fireEvent.pointerUp(slider, { clientX: 100, pointerId: 1 });
    expect(slider.getAttribute("aria-valuenow")).toBe("50000");
    expect(slider.getAttribute("aria-valuetext")).toBe("0:50 of 1:40");
  });

  it("cancels the drag without seeking when pointer capture is lost", () => {
    const slider = renderSeekbar(100_000);
    slider.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 16 }) as DOMRect;
    fireEvent.pointerDown(slider, { button: 0, clientX: 150, pointerId: 1 });
    expect(slider.getAttribute("aria-valuenow")).toBe("75000");
    fireEvent(slider, new Event("lostpointercapture", { bubbles: true }));
    expect(slider.getAttribute("aria-valuenow")).toBe("0");
    fireEvent.pointerUp(slider, { clientX: 150, pointerId: 1 });
    expect(slider.getAttribute("aria-valuenow")).toBe("0");
  });
});
