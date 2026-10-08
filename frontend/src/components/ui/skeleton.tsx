import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

/** Loading placeholder block; size it with className. Hidden from assistive tech. */
export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-shimmer rounded-item bg-skeleton", className)}
      {...rest}
    />
  );
}

/** A list-row placeholder: avatar-sized square, a title bar and a meta bar. */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex items-center gap-3 py-3", className)}>
      <Skeleton className="size-avatar-lg rounded-item" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}
