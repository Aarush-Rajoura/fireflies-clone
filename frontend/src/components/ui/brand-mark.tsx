import { cn } from "@/lib/utils/cn";

/** Our own glyph (three stepped bars) plus the wordmark. No third-party logo. */
export function BrandMark({
  withWordmark = false,
  className,
}: {
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span aria-hidden className="flex w-6 flex-col gap-0.5">
        <span className="h-1.5 w-6 rounded-full bg-brand-mark" />
        <span className="h-1.5 w-4 rounded-full bg-accent-hover" />
        <span className="h-1.5 w-2 rounded-full bg-accent" />
      </span>
      {withWordmark && <span className="text-h3 tracking-tight text-strong">fireflies.ai</span>}
    </span>
  );
}
