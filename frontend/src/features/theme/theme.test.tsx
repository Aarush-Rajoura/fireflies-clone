import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "./ThemeProvider";
import { useTheme } from "./hooks/useTheme";
import {
  PRE_PAINT_SCRIPT,
  STORAGE_KEY,
  nextPreference,
  readPreference,
  resolveTheme,
  writePreference,
} from "./lib/theme-store";

type Listener = (e: { matches: boolean }) => void;

/** A controllable prefers-color-scheme: light media query. */
function mockSystemLight(initial: boolean) {
  let matches = initial;
  const listeners = new Set<Listener>();
  window.matchMedia = vi.fn().mockImplementation(() => ({
    get matches() {
      return matches;
    },
    addEventListener: (_: string, l: Listener) => listeners.add(l),
    removeEventListener: (_: string, l: Listener) => listeners.delete(l),
  }));
  return (next: boolean) => {
    matches = next;
    listeners.forEach((l) => l({ matches: next }));
  };
}

function Probe() {
  const { preference, theme, setPreference } = useTheme();
  return (
    <>
      <span data-testid="pref">{preference}</span>
      <span data-testid="theme">{theme}</span>
      <input aria-label="set" onChange={(e) => setPreference(e.target.value as never)} />
    </>
  );
}

const renderThemed = () =>
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
const rootTheme = (c: HTMLElement) => c.querySelector(".ff-app")?.getAttribute("data-theme");

describe("theme store", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("defaults to dark and ignores junk in storage", () => {
    expect(readPreference()).toBe("dark");
    window.localStorage.setItem(STORAGE_KEY, "sepia");
    expect(readPreference()).toBe("dark");
  });

  it("persists the preference in localStorage", () => {
    writePreference("light");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("light");
    expect(readPreference()).toBe("light");
  });

  it("keeps the choice in memory when storage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => writePreference("system")).not.toThrow();
    expect(readPreference()).toBe("system");
  });

  it("resolves system against the OS setting and cycles dark → light → system", () => {
    expect(resolveTheme("system", true)).toBe("light");
    expect(resolveTheme("system", false)).toBe("dark");
    expect(resolveTheme("light", false)).toBe("light");
    expect(nextPreference("dark")).toBe("light");
    expect(nextPreference("light")).toBe("system");
    expect(nextPreference("system")).toBe("dark");
  });
});

describe("ThemeProvider", () => {
  beforeEach(() => window.localStorage.clear());

  it("applies the stored preference to the themed root", () => {
    mockSystemLight(false);
    window.localStorage.setItem(STORAGE_KEY, "light");
    const { container } = renderThemed();
    expect(screen.getByTestId("pref").textContent).toBe("light");
    expect(rootTheme(container)).toBe("light");
  });

  it("follows the OS live when the preference is system", () => {
    const setSystemLight = mockSystemLight(true);
    window.localStorage.setItem(STORAGE_KEY, "system");
    const { container } = renderThemed();
    expect(rootTheme(container)).toBe("light");
    act(() => setSystemLight(false));
    expect(rootTheme(container)).toBe("dark");
    expect(screen.getByTestId("pref").textContent).toBe("system");
  });

  it("falls back to dark when matchMedia is unavailable", () => {
    // @ts-expect-error simulate an environment without matchMedia
    delete window.matchMedia;
    window.localStorage.setItem(STORAGE_KEY, "system");
    const { container } = renderThemed();
    expect(rootTheme(container)).toBe("dark");
  });
});

describe("pre-paint script", () => {
  const run = (stored: string | null, systemLight: boolean) => {
    mockSystemLight(systemLight);
    window.localStorage.clear();
    if (stored) window.localStorage.setItem(STORAGE_KEY, stored);
    const el = document.createElement("div");
    el.setAttribute("data-theme", "dark");
    const script = document.createElement("script");
    el.appendChild(script);
    // jsdom does not run inline scripts; emulate currentScript for the snippet.
    Object.defineProperty(document, "currentScript", { value: script, configurable: true });
    new Function(PRE_PAINT_SCRIPT)();
    Object.defineProperty(document, "currentScript", { value: null, configurable: true });
    return el.getAttribute("data-theme");
  };

  it("matches the provider's resolution", () => {
    expect(run(null, true)).toBe("dark");
    expect(run("light", false)).toBe("light");
    expect(run("dark", true)).toBe("dark");
    expect(run("system", true)).toBe("light");
    expect(run("system", false)).toBe("dark");
  });
});
