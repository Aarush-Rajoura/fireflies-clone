import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  /** Small icon above the title (Tasks style) … */
  icon?: ReactNode;
  /** … or a larger illustration, e.g. <SkeletonCardsIllustration/> (Meetings style). */
  illustration?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  illustration,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-md flex-col items-center px-6 py-12 text-center",
        className,
      )}
    >
      {illustration && <div className="mb-10 w-full">{illustration}</div>}
      {icon && <div className="mb-4 text-secondary [&_svg]:size-8">{icon}</div>}
      {/* Fireflies' two empty-state styles differ in emphasis: illustrated is bold and bright, icon-led is quieter. */}
      <h2 className={cn("text-h3", illustration ? "text-strong" : "font-medium text-secondary")}>
        {title}
      </h2>
      {description && (
        <p className={cn("mt-2 text-body", illustration ? "text-secondary" : "text-muted")}>
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/**
 * The stacked "skeleton rows" picture from the empty Meetings list: three
 * cards, the middle one wider, each with a letter tile and two bars.
 */
export function SkeletonCardsIllustration({ letters = ["K", "A", "R"] }: { letters?: string[] }) {
  return (
    <div aria-hidden className="flex flex-col items-center gap-5">
      {letters.map((letter, i) => (
        <div
          key={`${letter}-${i}`}
          className={cn(
            "flex items-center gap-3 rounded-panel border border-strong bg-surface-sunken px-3",
            i === 1 ? "h-14 w-full max-w-[420px]" : "h-12 w-[82%] max-w-[336px]",
          )}
        >
          <span className="flex size-6 items-center justify-center rounded-tag bg-skeleton text-micro text-secondary">
            {letter}
          </span>
          <span className="flex flex-col gap-1.5">
            <span className="block h-1.5 w-24 rounded-full bg-skeleton" />
            <span className="block h-1.5 w-10 rounded-full bg-skeleton" />
          </span>
        </div>
      ))}
    </div>
  );
}
