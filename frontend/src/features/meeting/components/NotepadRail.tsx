"use client";

import { Bookmark, MessageSquare, Scissors, Search, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { IconButton, toast } from "@/components/ui";

import type { NotepadFlyout } from "../hooks/useNotepadFlyouts";

export type NotepadRailProps = {
  open: NotepadFlyout | null;
  onToggle: (flyout: NotepadFlyout) => void;
  onSearch: () => void;
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
  commentCount,
  soundbiteCount,
}: NotepadRailProps) {
  return (
    <nav
      aria-label="Meeting tools"
      className="flex w-rail-mini shrink-0 flex-col items-center gap-1 border-r border-subtle py-3"
    >
      <IconButton
        label="Search transcript"
        icon={<Search strokeWidth={1.75} />}
        onClick={onSearch}
      />
      <IconButton
        label="Ask AI"
        icon={<Sparkles strokeWidth={1.75} />}
        active={open === "ai"}
        onClick={() => onToggle("ai")}
      />
      <Counted count={soundbiteCount}>
        <IconButton
          label={`Soundbites (${soundbiteCount})`}
          icon={<Scissors strokeWidth={1.75} />}
          active={open === "soundbites"}
          onClick={() => onToggle("soundbites")}
        />
      </Counted>
      <Counted count={commentCount}>
        <IconButton
          label={`Comments (${commentCount})`}
          icon={<MessageSquare strokeWidth={1.75} />}
          active={open === "comments"}
          onClick={() => onToggle("comments")}
        />
      </Counted>
      <IconButton
        label="Bookmarks (coming soon)"
        icon={<Bookmark strokeWidth={1.75} />}
        aria-disabled
        className="opacity-50"
        onClick={() => toast.info("Bookmarks are coming soon.")}
      />
    </nav>
  );
}
