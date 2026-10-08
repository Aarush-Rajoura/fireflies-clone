import { cn } from "@/lib/utils/cn";

/** Determinate progress, e.g. "step 2 of 5". `value` is clamped to 0..max. */
export function ProgressBar({
  value,
  max = 100,
  label,
  valueText,
  className,
}: {
  value: number;
  max?: number;
  label: string;
  valueText?: string;
  className?: string;
}) {
  const clamped = Math.min(Math.max(value, 0), max);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={clamped}
      aria-valuetext={valueText}
      className={cn("h-1.5 overflow-hidden rounded-full bg-surface-3", className)}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-base ease-ff"
        style={{ width: `${max > 0 ? (clamped / max) * 100 : 0}%` }}
      />
    </div>
  );
}
