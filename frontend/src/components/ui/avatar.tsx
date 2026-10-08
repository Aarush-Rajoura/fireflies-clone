import { cn } from "@/lib/utils/cn";
import { initials, speakerIndex } from "@/lib/utils/identity";

export type AvatarSize = "sm" | "md" | "lg";

const sizes: Record<AvatarSize, string> = {
  sm: "size-avatar-sm text-micro",
  md: "size-avatar-md text-caption",
  lg: "size-avatar-lg text-body-strong",
};

const fills = [
  "bg-avatar-0",
  "bg-avatar-1",
  "bg-avatar-2",
  "bg-avatar-3",
  "bg-avatar-4",
  "bg-avatar-5",
  "bg-avatar-6",
  "bg-avatar-7",
] as const;

export type AvatarProps = { name: string; src?: string; size?: AvatarSize; className?: string };

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const ring = "ring-2 ring-surface-0";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars come from arbitrary hosts.
      <img
        src={src}
        alt={name}
        className={cn("shrink-0 rounded-full object-cover", sizes[size], ring, className)}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold leading-none text-on-accent",
        sizes[size],
        fills[speakerIndex(name)],
        ring,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export type AvatarGroupProps = {
  names: string[];
  max?: number;
  size?: AvatarSize;
  className?: string;
};

export function AvatarGroup({ names, max = 3, size = "sm", className }: AvatarGroupProps) {
  const shown = names.slice(0, max);
  const hidden = names.length - shown.length;
  return (
    <div className={cn("flex items-center -space-x-1", className)}>
      {shown.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} size={size} />
      ))}
      {hidden > 0 && (
        <span
          aria-label={`${hidden} more`}
          title={names.slice(max).join(", ")}
          className={cn(
            "tnum inline-flex shrink-0 items-center justify-center rounded-full bg-surface-3 font-semibold text-secondary ring-2 ring-surface-0",
            sizes[size],
          )}
        >
          +{hidden}
        </span>
      )}
    </div>
  );
}
