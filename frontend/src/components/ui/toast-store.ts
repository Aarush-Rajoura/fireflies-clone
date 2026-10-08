/*
 * Framework-free toast store: a tiny pub/sub so `toast.success(...)` can be
 * called from anywhere (mutation callbacks, non-React code) and <Toaster/>
 * subscribes with useSyncExternalStore.
 */

export type ToastKind = "success" | "error" | "info";

export type ToastAction = { label: string; onClick: () => void };

export type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
};

export const MAX_VISIBLE = 3;
export const AUTO_DISMISS_MS = 5000;

type Listener = () => void;
type Timer = { handle?: ReturnType<typeof setTimeout>; startedAt: number; remaining: number };

let toasts: readonly Toast[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
const timers = new Map<number, Timer>();

function emit() {
  listeners.forEach((l) => l());
}

function clearTimer(id: number) {
  const t = timers.get(id);
  if (t?.handle) clearTimeout(t.handle);
  timers.delete(id);
}

function startTimer(id: number, remaining: number) {
  timers.set(id, {
    handle: setTimeout(() => dismiss(id), remaining),
    startedAt: Date.now(),
    remaining,
  });
}

export function dismiss(id: number): void {
  clearTimer(id);
  const next = toasts.filter((x) => x.id !== id);
  if (next.length !== toasts.length) {
    toasts = next;
    emit();
  }
}

/** Freezes the countdown while the user hovers or focuses a toast. */
export function pause(id: number): void {
  const t = timers.get(id);
  if (!t?.handle) return;
  clearTimeout(t.handle);
  timers.set(id, {
    startedAt: 0,
    remaining: Math.max(0, t.remaining - (Date.now() - t.startedAt)),
  });
}

export function resume(id: number): void {
  const t = timers.get(id);
  if (!t || t.handle) return;
  startTimer(id, t.remaining);
}

/** Runs the toast's action, then dismisses it even if the action throws. */
export function runAction(item: Toast): void {
  try {
    item.action?.onClick();
  } finally {
    dismiss(item.id);
  }
}

function push(kind: ToastKind, message: string, action?: ToastAction): number {
  const id = nextId++;
  // Newest last; the oldest beyond the cap is dropped rather than queued so a
  // burst of errors can't bury the screen.
  const next = [...toasts, { id, kind, message, action }];
  while (next.length > MAX_VISIBLE) {
    const dropped = next.shift();
    if (dropped) clearTimer(dropped.id);
  }
  toasts = next;
  startTimer(id, AUTO_DISMISS_MS);
  emit();
  return id;
}

export const toast = {
  success: (message: string, action?: ToastAction) => push("success", message, action),
  error: (message: string, opts?: { retry?: () => void }) =>
    push("error", message, opts?.retry ? { label: "Retry", onClick: opts.retry } : undefined),
  info: (message: string) => push("info", message),
  undo: (message: string, onUndo: () => void) =>
    push("info", message, { label: "Undo", onClick: onUndo }),
  dismiss,
};

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToasts(): readonly Toast[] {
  return toasts;
}

const EMPTY: readonly Toast[] = [];
export function getServerToasts(): readonly Toast[] {
  return EMPTY;
}

/** Test helper: clears state and pending timers between cases. */
export function resetToasts(): void {
  [...timers.keys()].forEach(clearTimer);
  toasts = [];
  emit();
}
