import { act, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VirtualClockEngine } from "./engines/virtual-clock-engine";
import { usePlayerClock } from "./hooks/usePlayerClock";
import { usePlayerControls } from "./hooks/usePlayerControls";
import { useInitialSeek } from "./hooks/useInitialSeek";
import type { PlayerControls } from "./lib/player-runtime";
import { PlayerProvider } from "./PlayerProvider";
import { installFakePlayerTimers } from "./testing/fake-timers";

const createEngine = ({ durationMs }: { durationMs: number }) =>
  new VirtualClockEngine({ durationMs });

describe("PlayerProvider", () => {
  beforeEach(() => installFakePlayerTimers());
  afterEach(() => vi.useRealTimers());

  it("keeps usePlayerControls identity stable and never re-renders control-only consumers on ticks", () => {
    const seen: PlayerControls[] = [];
    let clockRenders = 0;
    let controls!: PlayerControls;

    function ControlsOnly() {
      controls = usePlayerControls();
      seen.push(controls);
      return null;
    }
    function ClockReader() {
      const { currentMs } = usePlayerClock();
      clockRenders++;
      return <span data-testid="t">{currentMs}</span>;
    }

    render(
      <PlayerProvider durationMs={60_000} createEngine={createEngine}>
        <ControlsOnly />
        <ClockReader />
      </PlayerProvider>,
    );
    const rendersBefore = clockRenders;

    act(() => controls.play());
    // Step in act() so each frame's store update is flushed as its own render.
    for (let i = 0; i < 20; i++) act(() => vi.advanceTimersByTime(100));
    act(() => controls.seek(30_000));
    act(() => controls.setRate(2));
    act(() => controls.pause());

    expect(seen).toHaveLength(1);
    // ~10 updates/s while playing: proves the clock really ticked.
    expect(clockRenders - rendersBefore).toBeGreaterThanOrEqual(15);
    expect(clockRenders - rendersBefore).toBeLessThanOrEqual(30);
    expect(Number(screen.getByTestId("t").textContent)).toBe(30_000);
  });

  it("applies a ?t= deep link issued before the engine attached", () => {
    function Probe() {
      useInitialSeek("1:30");
      return <span data-testid="t">{usePlayerClock().currentMs}</span>;
    }
    render(
      <PlayerProvider durationMs={600_000} createEngine={createEngine}>
        <Probe />
      </PlayerProvider>,
    );
    expect(screen.getByTestId("t").textContent).toBe("90000");
  });

  it("survives StrictMode's double mount with one live engine and the deep link intact", () => {
    const made: VirtualClockEngine[] = [];
    function Probe() {
      useInitialSeek("45");
      return <span data-testid="t">{usePlayerClock().currentMs}</span>;
    }
    render(
      <StrictMode>
        <PlayerProvider
          durationMs={600_000}
          createEngine={(a) => {
            const e = new VirtualClockEngine(a);
            made.push(e);
            return e;
          }}
        >
          <Probe />
        </PlayerProvider>
      </StrictMode>,
    );
    expect(made).toHaveLength(2);
    expect(made[1]?.currentMs).toBe(45_000);
    expect(screen.getByTestId("t").textContent).toBe("45000");
  });

  it("uses the injected engine and destroys it on unmount", () => {
    const engine = new VirtualClockEngine({ durationMs: 10_000 });
    const destroy = vi.spyOn(engine, "destroy");
    const { unmount } = render(
      <PlayerProvider durationMs={10_000} createEngine={() => engine}>
        <span />
      </PlayerProvider>,
    );
    unmount();
    expect(destroy).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("throws a helpful error outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    function Orphan() {
      usePlayerControls();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(/PlayerProvider/);
  });
});
