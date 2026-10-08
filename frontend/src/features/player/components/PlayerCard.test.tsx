import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui";

import { VirtualClockEngine } from "../engines/virtual-clock-engine";
import { PlayerProvider } from "../PlayerProvider";
import { installFakePlayerTimers } from "../testing/fake-timers";
import { PlayerCard } from "./PlayerCard";

function renderCard() {
  render(
    <TooltipProvider>
      <PlayerProvider durationMs={2_538_000} createEngine={(a) => new VirtualClockEngine(a)}>
        <PlayerCard />
      </PlayerProvider>
    </TooltipProvider>,
  );
}

describe("PlayerCard", () => {
  beforeEach(() => installFakePlayerTimers());
  afterEach(() => vi.useRealTimers());

  it("shows the time readout and plays, skips and mutes", () => {
    renderCard();
    const card = screen.getByRole("region", { name: "Media player" });
    expect(card.textContent).toContain("0:00 / 42:18");
    expect(card.querySelector("audio")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    // The readout lags the engine by at most one ~100ms publish interval.
    act(() => vi.advanceTimersByTime(3_200));
    expect(card.textContent).toContain("0:03 / 42:18");
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));

    fireEvent.click(screen.getByRole("button", { name: "Forward 15 seconds" }));
    expect(card.textContent).toContain("0:18 / 42:18");
    fireEvent.click(screen.getByRole("button", { name: "Back 15 seconds" }));
    expect(card.textContent).toContain("0:03 / 42:18");

    fireEvent.click(screen.getByRole("button", { name: "Mute" }));
    expect(screen.getByRole("button", { name: "Unmute" })).toBeTruthy();
    expect((screen.getByLabelText("Volume") as HTMLInputElement).value).toBe("0");
  });

  it("Space anywhere on the page toggles playback", () => {
    renderCard();
    fireEvent.keyDown(document.body, { key: " " });
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
  });
});
