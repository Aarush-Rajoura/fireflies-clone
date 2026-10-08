import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type ChartCardProps = {
  title: string;
  /** One line under the title: what is measured, or the headline finding. */
  description?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** The card every analytics chart sits in; labelled by its title for landmarks. */
export function ChartCard({ title, description, children, className }: ChartCardProps) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "flex min-w-0 flex-col rounded-card border border-subtle bg-surface-1 p-5",
        className,
      )}
    >
      <header className="mb-4">
        <h2 id={id} className="text-h3 text-strong">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-meta text-muted">{description}</p>}
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

/** Quiet in-card note for a chart with nothing to draw. */
export function ChartEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="flex flex-1 items-center justify-center py-8 text-center text-meta text-muted">
      {children}
    </p>
  );
}
