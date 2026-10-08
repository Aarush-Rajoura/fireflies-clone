"use client";

import { AlertCircle } from "lucide-react";
import { useEffect, useRef } from "react";

export type InlineErrorProps = {
  message: string;
  /**
   * Move focus here when shown, for errors that replace a progress state that
   * held focus (otherwise focus would fall back to the document body).
   */
  focusOnMount?: boolean;
};

/** An error the user can act on in place, kept next to the input it is about. */
export function InlineError({ message, focusOnMount = false }: InlineErrorProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (focusOnMount) ref.current?.focus();
  }, [focusOnMount]);

  return (
    <p
      ref={ref}
      role="alert"
      tabIndex={focusOnMount ? -1 : undefined}
      className="flex items-start gap-2 rounded-item border border-danger bg-danger-subtle px-3 py-2 text-meta text-danger-strong"
    >
      <AlertCircle className="mt-px size-4 shrink-0" strokeWidth={1.75} />
      {message}
    </p>
  );
}
