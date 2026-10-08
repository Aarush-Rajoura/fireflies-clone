import { vi } from "vitest";

/**
 * A real jsdom <audio> whose unimplemented media methods are stubbed with a
 * clock driven by (faked) performance.now(), so AudioEngine runs unmodified.
 *
 * With `{ metadata: false }` the duration stays unknown (NaN) until
 * `loadMetadata()` is called, which clamps the position to the file like a
 * browser does and fires `loadedmetadata`.
 */
export function createStubAudio(durationSec: number, { metadata = true } = {}) {
  const el = document.createElement("audio");
  let known = metadata;
  let position = 0;
  let startedAt = 0;
  let paused = true;
  const end = () => (known ? durationSec : Number.POSITIVE_INFINITY);

  const read = () => {
    if (paused) return position;
    return Math.min(end(), position + ((performance.now() - startedAt) / 1000) * el.playbackRate);
  };
  const rebase = () => {
    position = read();
    startedAt = performance.now();
  };

  Object.defineProperties(el, {
    duration: { configurable: true, get: () => (known ? durationSec : Number.NaN) },
    paused: { configurable: true, get: () => paused },
    ended: { configurable: true, get: () => read() >= end() },
    currentTime: {
      configurable: true,
      get: read,
      set: (v: number) => {
        position = Math.min(end(), Math.max(0, v));
        startedAt = performance.now();
      },
    },
  });

  // jsdom's playbackRate setter works, but the stub must fold elapsed time in first.
  let rate = 1;
  Object.defineProperty(el, "playbackRate", {
    configurable: true,
    get: () => rate,
    set: (r: number) => {
      rebase();
      rate = r;
    },
  });

  el.play = vi.fn(() => {
    if (paused) {
      startedAt = performance.now();
      paused = false;
    }
    return Promise.resolve();
  });
  el.pause = vi.fn(() => {
    if (!paused) rebase();
    paused = true;
  });
  el.load = vi.fn();

  return Object.assign(el, {
    loadMetadata() {
      rebase();
      known = true;
      position = Math.min(position, durationSec);
      el.dispatchEvent(new Event("loadedmetadata"));
    },
  });
}
