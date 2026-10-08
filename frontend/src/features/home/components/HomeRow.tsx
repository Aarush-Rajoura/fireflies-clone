import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { initials, speakerIndex } from "@/lib/utils/identity";

// Literal class names so Tailwind can see them; same buckets as <Avatar/>.
const TILE_FILLS = [
  "bg-avatar-0",
  "bg-avatar-1",
  "bg-avatar-2",
  "bg-avatar-3",
  "bg-avatar-4",
  "bg-avatar-5",
  "bg-avatar-6",
  "bg-avatar-7",
] as const;

export type HomeRowProps = {
  href: string;
  title: string;
  meta: ReactNode;
  /** Text the tile's letters and colour come from; defaults to the title. */
  tileFrom?: string;
  /** Replaces the letter tile, e.g. a feed-kind icon. */
  icon?: ReactNode;
  trailing?: ReactNode;
};

/** One Home list row: tile, title over a muted meta line, optional trailing slot. */
export function HomeRow({ href, title, meta, tileFrom, icon, trailing }: HomeRowProps) {
  const seed = tileFrom ?? title;
  return (
    <li className="group relative flex items-center gap-4 rounded-panel px-5 py-3 hover:bg-surface-hover">
      <span
        aria-hidden
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-item text-body-strong text-on-accent [&_svg]:size-5",
          icon ? "bg-surface-3 text-secondary" : TILE_FILLS[speakerIndex(seed)],
        )}
      >
        {icon ?? initials(seed)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* The stretched link makes the whole row clickable while trailing controls stay usable. */}
        <Link
          href={href}
          className="truncate text-[16px] font-medium leading-6 text-primary after:absolute after:inset-0 after:rounded-panel"
        >
          {title}
        </Link>
        <div className="truncate text-[15px] leading-6 text-muted">{meta}</div>
      </div>
      {trailing && <div className="relative flex shrink-0 items-center gap-2">{trailing}</div>}
    </li>
  );
}
