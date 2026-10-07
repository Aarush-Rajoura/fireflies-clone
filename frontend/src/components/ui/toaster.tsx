"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils/cn";

import { dismiss, getServerToasts, getToasts, subscribe, type Toast, type ToastKind } from "./toast-store";

const icons: Record<ToastKind, { Icon: typeof Info; tone: string }> = {
  success: { Icon: CheckCircle2, tone: "text-success" },
  error: { Icon: XCircle, tone: "text-danger" },
  info: { Icon: Info, tone: "text-accent" },
};

function ToastRow({ toast }: { toast: Toast }) {
  const { Icon, tone } = icons[toast.kind];
  return (
    <li
      // Errors interrupt; everything else waits politely.
      role={toast.kind === "error" ? "alert" : "status"}
      className="pointer-events-auto flex w-toast max-w-[calc(100vw-32px)] items-start gap-3 rounded-md border border-subtle bg-surface-1 py-3 pl-3.5 pr-2 shadow-lg animate-toast-in"
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", tone)} strokeWidth={1.75} aria-hidden />
      <p className="min-w-0 flex-1 text-body text-primary">{toast.message}</p>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            dismiss(toast.id);
          }}
          className="shrink-0 rounded-xs px-1.5 text-body-strong text-accent hover:underline"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => dismiss(toast.id)}
        className="flex size-6 shrink-0 items-center justify-center rounded-xs text-muted hover:bg-surface-hover hover:text-primary"
      >
        <X className="size-3.5" strokeWidth={1.75} />
      </button>
    </li>
  );
}

/** Mount once near the root. Bottom-right stack, newest at the bottom. */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribe, getToasts, getServerToasts);
  return (
    <ol
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-4 right-4 z-toast flex flex-col items-end gap-2"
    >
      {toasts.map((t) => (
        <ToastRow key={t.id} toast={t} />
      ))}
    </ol>
  );
}
