"use client";

import { useSyncExternalStore } from "react";

const noSubscription = () => () => {};

function browserZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/** The viewer's IANA zone, or null during server rendering where it is unknown. */
export function useBrowserTimeZone(): string | null {
  return useSyncExternalStore(noSubscription, browserZone, () => null);
}
