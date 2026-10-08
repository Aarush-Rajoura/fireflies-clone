"use client";

import { Bookmark, MessageSquare, Scissors, Search, Sparkles } from "lucide-react";
import type { ReactNode, Ref } from "react";

import { IconButton } from "@/components/ui";

import type { NotepadFlyout } from "../hooks/useNotepadFlyouts";

export type NotepadRailProps = {
  open: NotepadFlyout | null;
  onToggle: (flyout: NotepadFlyout) => void;
  onSearch: () => void;
  /** Where focus returns when a flyout closes. */
  triggerRef: (flyout: NotepadFlyout) => Ref<HTMLButtonElement>;
  commentCount: number;
  soundbiteCount: number;
};

function Counted({ count, children }: { count: number; children: ReactNode }) {
  return (
    <span className="relative flex">
      {children}
      {count > 0 && (
        <span
          aria-hidden
          className="tnum pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-micro text-on-accent"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );
}

/** The slim icon rail on the summary's left edge (design-ref 03), toggling the flyouts. */
export function NotepadRail({
  open,
  onToggle,
  onSearch,
  triggerRef,
  commentCount,
  soundbiteCount,
}: NotepadRailProps) {
  const flyout = (id: NotepadFlyout, label: string, icon: ReactNode, count?: number) => {
    const button = (
      <IconButton
        ref={triggerRef(id)}
        label={label}
        icon={icon}
        active={open === id}
        aria-expanded={open === id}
        onClick={() => onToggle(id)}
      />
    );
    return count === undefined ? button : <Counted count={count}>{button}</Counted>;
  };

  return (
    <nav
      aria-label="Meeting tools"
      className="flex w-rail-mini shrink-0 flex-col items-center gap-1 border-r border-subtle py-3"
    >
      <IconButton label="Search transcript" icon={<Search strokeWidth={1.75} />} onClick={onSearch} />
      {flyout("ai", "Ask AI", <Sparkles strokeWidth={1.75} />)}
      {flyout(
        "soundbites",
        `Soundbites (${soundbiteCount})`,
        <Scissors strokeWidth={1.75} />,
        soundbiteCount,
      )}
      {flyout(
        "comments",
        `Comments (${commentCount})`,
        <MessageSquare strokeWidth={1.75} />,
        commentCount,
      )}
      {flyout("bookmarks", "Bookmarks", <Bookmark strokeWidth={1.75} />)}
    </nav>
  );
}
