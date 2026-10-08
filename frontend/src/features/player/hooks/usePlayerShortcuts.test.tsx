import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VirtualClockEngine } from "../engines/virtual-clock-engine";
import { PlayerProvider } from "../PlayerProvider";
import { installFakePlayerTimers } from "../testing/fake-timers";
import { usePlayerClock } from "./usePlayerClock";
import { usePlayerShortcuts } from "./usePlayerShortcuts";

function Harness() {
  usePlayerShortcuts();
  const { currentMs, isPlaying } = usePlayerClock();
  return (
    <div>
      <output data-testid="state">{`${currentMs}|${isPlaying}`}</output>
      <input aria-label="search" />
      <textarea aria-label="note" />
      <div aria-label="editor" contentEditable suppressContentEditableWarning>
        <span data-testid="inner">text</span>
      </div>
      <button type="button">other</button>
    </div>
  );
}

function setup() {
  render(
    <PlayerProvider durationMs={120_000} createEngine={(a) => new VirtualClockEngine(a)}>
      <Harness />
    </PlayerProvider>,
  );
  return () => screen.getByTestId("state").textContent;
}

describe("usePlayerShortcuts", () => {
  beforeEach(() => installFakePlayerTimers());
  afterEach(() => vi.useRealTimers());

  it("Space toggles, K pauses, J/L skip 10s, arrows skip 5s", () => {
    const state = setup();
    fireEvent.keyDown(document.body, { key: " " });
    expect(state()).toBe("0|true");
    fireEvent.keyDown(document.body, { key: "k" });
    expect(state()).toBe("0|false");
    fireEvent.keyDown(document.body, { key: "l" });
    expect(state()).toBe("10000|false");
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(state()).toBe("15000|false");
    fireEvent.keyDown(document.body, { key: "J" });
    fireEvent.keyDown(document.body, { key: "ArrowLeft" });
    expect(state()).toBe("0|false");
  });

  it.each(["search", "note", "editor"])("ignores keys typed into %s", (label) => {
    const state = setup();
    const target = label === "editor" ? screen.getByTestId("inner") : screen.getByLabelText(label);
    for (const key of [" ", "l", "ArrowRight", "j"]) fireEvent.keyDown(target, { key });
    expect(state()).toBe("0|false");
  });

  it("leaves Space to a focused button and ignores modified keys", () => {
    const state = setup();
    fireEvent.keyDown(screen.getByRole("button", { name: "other" }), { key: " " });
    fireEvent.keyDown(document.body, { key: "l", ctrlKey: true });
    expect(state()).toBe("0|false");
  });
});
