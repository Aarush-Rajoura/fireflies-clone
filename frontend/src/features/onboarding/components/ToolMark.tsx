import { cn } from "@/lib/utils/cn";

// Literal class names so Tailwind sees them; indexed by ToolOption.tone.
const FILLS = [
  "bg-avatar-0",
  "bg-avatar-1",
  "bg-avatar-2",
  "bg-avatar-3",
  "bg-avatar-4",
  "bg-avatar-5",
  "bg-avatar-6",
  "bg-avatar-7",
] as const;

/** A drawn monogram tile standing in for a product logo. */
export function ToolMark({
  mark,
  tone,
  className,
}: {
  mark: string;
  tone: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-6 shrink-0 select-none items-center justify-center rounded-item text-micro leading-none text-on-accent",
        FILLS[tone % FILLS.length],
        className,
      )}
    >
      {mark}
    </span>
  );
}
