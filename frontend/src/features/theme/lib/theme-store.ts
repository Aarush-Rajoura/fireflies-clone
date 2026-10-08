import type { Theme } from "@/components/ui";

export type ThemePreference = Theme | "system";

export const THEME_PREFERENCES: readonly ThemePreference[] = ["dark", "light", "system"];
export const DEFAULT_PREFERENCE: ThemePreference = "dark";
export const STORAGE_KEY = "ff-theme";

const LIGHT_QUERY = "(prefers-color-scheme: light)";

const isPreference = (v: unknown): v is ThemePreference =>
  typeof v === "string" && (THEME_PREFERENCES as readonly string[]).includes(v);

// Used when storage is unavailable (private mode, blocked cookies) so the choice still holds for the session.
let memory: ThemePreference | null = null;
const listeners = new Set<() => void>();

export function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isPreference(stored)) return stored;
  } catch {
    // Storage blocked: fall through to the in-memory value.
  }
  return memory ?? DEFAULT_PREFERENCE;
}

export function writePreference(next: ThemePreference): void {
  memory = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Keep the in-memory value; the choice just won't survive a reload.
  }
  listeners.forEach((l) => l());
}

export function subscribePreference(listener: () => void): () => void {
  listeners.add(listener);
  // Other tabs changing the theme.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function systemPrefersLight(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(LIGHT_QUERY).matches;
}

export function subscribeSystem(listener: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => undefined;
  const mql = window.matchMedia(LIGHT_QUERY);
  mql.addEventListener("change", listener);
  return () => mql.removeEventListener("change", listener);
}

export function resolveTheme(preference: ThemePreference, prefersLight: boolean): Theme {
  if (preference === "system") return prefersLight ? "light" : "dark";
  return preference;
}

export function nextPreference(current: ThemePreference): ThemePreference {
  const i = THEME_PREFERENCES.indexOf(current);
  return THEME_PREFERENCES[(i + 1) % THEME_PREFERENCES.length] ?? DEFAULT_PREFERENCE;
}

/**
 * Runs before first paint, inside the server-rendered `.ff-app` element, so a
 * stored light preference never flashes dark. Mirrors readPreference +
 * resolveTheme; kept dependency-free because it executes as a raw string.
 */
export const PRE_PAINT_SCRIPT = `(function(){try{var el=document.currentScript&&document.currentScript.parentElement;if(!el)return;var p=null;try{p=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)})}catch(e){}var t=p==="light"||p==="dark"?p:p==="system"&&window.matchMedia&&window.matchMedia(${JSON.stringify(
  LIGHT_QUERY,
)}).matches?"light":"dark";el.setAttribute("data-theme",t)}catch(e){}})();`;
