import { useSyncExternalStore } from "react";

type NavigatorLike = {
  platform?: string;
  userAgent?: string;
  userAgentData?: { platform?: string };
};

/** macOS / iOS, where the shortcut modifier is ⌘ rather than Ctrl. */
export function isApplePlatform(nav: NavigatorLike | undefined): boolean {
  if (!nav) return false;
  const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent || "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}

const noopSubscribe = () => () => undefined;

/**
 * "⌘" on Apple devices, otherwise "Ctrl". The server (and hydration) render
 * "Ctrl" so markup matches, then the client corrects it.
 */
export function useModKeyLabel(): string {
  const apple = useSyncExternalStore(
    noopSubscribe,
    () => isApplePlatform(navigator as NavigatorLike),
    () => false,
  );
  return apple ? "⌘" : "Ctrl";
}
