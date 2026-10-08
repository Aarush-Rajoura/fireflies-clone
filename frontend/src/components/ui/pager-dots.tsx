import { cn } from "@/lib/utils/cn";

export type PagerDotsProps = {
  count: number;
  index: number;
  onSelect: (index: number) => void;
  /** Names each dot, e.g. (i) => `Show slide ${i + 1}`. */
  itemLabel: (index: number) => string;
  className?: string;
};

/** The small dot row under a carousel: one button per slide, the current one in accent. */
export function PagerDots({ count, index, onSelect, itemLabel, className }: PagerDotsProps) {
  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={itemLabel(i)}
          aria-current={i === index ? "true" : undefined}
          onClick={() => onSelect(i)}
          // The hit area is larger than the visible dot so it stays easy to tap.
          className="group flex size-5 items-center justify-center rounded-full"
        >
          <span
            className={cn(
              "block size-2 rounded-full transition-colors duration-fast",
              i === index ? "bg-accent" : "bg-surface-selected group-hover:bg-accent-border",
            )}
          />
        </button>
      ))}
    </div>
  );
}
