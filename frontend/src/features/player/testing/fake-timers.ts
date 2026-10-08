import { vi } from "vitest";

/** Fakes the clocks the player reads (performance.now, rAF) along with timeouts. */
export function installFakePlayerTimers(): void {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "performance",
      "Date",
    ],
  });
}
