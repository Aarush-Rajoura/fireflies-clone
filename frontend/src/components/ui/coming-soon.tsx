import { cn } from "@/lib/utils/cn";

import { Badge } from "./badge";

/** Inline "Soon" marker for nav items and buttons that are visible but not built. */
export function SoonBadge({ className }: { className?: string }) {
  return (
    <Badge tone="accent" className={cn("normal-case", className)}>
      Soon
    </Badge>
  );
}

export type ComingSoonProps = {
  title: string;
  message?: string;
  className?: string;
};

/** Placeholder panel for a whole screen or section that is out of scope. */
export function ComingSoon({
  title,
  message = "We're still building this. It will appear here when it's ready.",
  className,
}: ComingSoonProps) {
  return (
    <div
      role="status"
      className={cn(
        "mx-auto flex max-w-md flex-col items-center gap-3 rounded-card border border-dashed border-strong bg-surface-sunken px-6 py-10 text-center",
        className,
      )}
    >
      <SoonBadge />
      <h2 className="text-h3 text-strong">{title}</h2>
      <p className="text-body text-secondary">{message}</p>
    </div>
  );
}
