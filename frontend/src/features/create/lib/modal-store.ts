import { useSyncExternalStore } from "react";

import type { CreateTab } from "./payload";

/*
 * A module-level store rather than a React context, so any feature (top bar,
 * meetings empty state, home cards) can open the one mounted modal without
 * sharing a provider.
 */
type State = { open: boolean; tab: CreateTab };

let state: State = { open: false, tab: "upload" };
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

export function openCreateMeeting(tab: CreateTab = "upload"): void {
  set({ open: true, tab });
}

export function closeCreateMeeting(): void {
  set({ ...state, open: false });
}

export function setCreateMeetingTab(tab: CreateTab): void {
  set({ ...state, tab });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const snapshot = () => state;

export function useCreateMeetingModal() {
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);
  return {
    isOpen: current.open,
    tab: current.tab,
    open: openCreateMeeting,
    close: closeCreateMeeting,
    setTab: setCreateMeetingTab,
  };
}
