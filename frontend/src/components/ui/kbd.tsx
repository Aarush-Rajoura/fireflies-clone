import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/** Keyboard hint, e.g. the muted "Ctrl + K" inside the global search. */
export function Kbd({ keys, className }: { keys: ReactNode[]; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center gap-1 font-app text-caption font-normal text-muted",
        className,
      )}
    >
      {keys.map((key, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span aria-hidden>+</span>}
          <span>{key}</span>
        </span>
      ))}
    </kbd>
  );
}
