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

let toasts: readonly Toast[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function emit() {
  listeners.forEach((l) => l());
}

export function dismiss(id: number): void {
  const t = timers.get(id);
  if (t) clearTimeout(t);
  timers.delete(id);
  const next = toasts.filter((x) => x.id !== id);
  if (next.length !== toasts.length) {
    toasts = next;
    emit();
  }
}

function push(kind: ToastKind, message: string, action?: ToastAction): number {
  const id = nextId++;
  // Newest last; the oldest beyond the cap is dropped rather than queued so a
  // burst of errors can't bury the screen.
  const next = [...toasts, { id, kind, message, action }];
  while (next.length > MAX_VISIBLE) {
    const dropped = next.shift();
    if (dropped) {
      clearTimeout(timers.get(dropped.id));
      timers.delete(dropped.id);
    }
  }
  toasts = next;
  timers.set(id, setTimeout(() => dismiss(id), AUTO_DISMISS_MS));
  emit();
  return id;
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string, opts?: { retry?: () => void }) =>
    push("error", message, opts?.retry ? { label: "Retry", onClick: opts.retry } : undefined),
  info: (message: string) => push("info", message),
  undo: (message: string, onUndo: () => void) => push("info", message, { label: "Undo", onClick: onUndo }),
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
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
  toasts = [];
  emit();
}
