"use client";

import { ChevronDown, Pencil } from "lucide-react";

import { Menu } from "@/components/ui";
import type { Speaker } from "@/lib/api";
import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/identity";

import { formatTimestamp } from "../lib/format-timestamp";

// Literal class names so Tailwind sees each one; indexed by the speaker's color_index.
const avatarFills = [
  "bg-avatar-0",
  "bg-avatar-1",
  "bg-avatar-2",
  "bg-avatar-3",
  "bg-avatar-4",
  "bg-avatar-5",
  "bg-avatar-6",
  "bg-avatar-7",
] as const;

export function speakerName(speaker: Speaker): string {
  return speaker.name.trim() || speaker.label;
}

export function SpeakerAvatar({ speaker }: { speaker: Speaker }) {
  const name = speakerName(speaker);
  const fill = avatarFills[Math.abs(speaker.color_index) % avatarFills.length];
  return (
    <span
      aria-hidden
      title={name}
      className={cn(
        "inline-flex size-avatar-sm shrink-0 select-none items-center justify-center rounded-item text-micro leading-none text-on-accent",
        fill,
      )}
    >
      {initials(name)}
    </span>
  );
}

export type SpeakerHeaderProps = {
  speaker: Speaker;
  startMs: number;
  onSeek: (ms: number) => void;
  onRename: (speakerId: number) => void;
};

/** "Name ▾ · 00:53": the name opens the speaker menu, the stamp seeks. */
export function SpeakerHeader({ speaker, startMs, onSeek, onRename }: SpeakerHeaderProps) {
  const name = speakerName(speaker);
  const stamp = formatTimestamp(startMs);
  return (
    <div className="flex items-center gap-2">
      <SpeakerAvatar speaker={speaker} />
      <Menu
        align="start"
        items={[
          {
            label: "Rename speaker",
            icon: <Pencil strokeWidth={1.75} />,
            onSelect: () => onRename(speaker.id),
          },
        ]}
        trigger={
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-tag text-body-strong text-strong hover:text-primary [&_svg]:size-3.5 [&_svg]:text-muted"
          >
            {name}
            <ChevronDown aria-hidden strokeWidth={1.75} />
          </button>
        }
      />
      <span aria-hidden className="text-muted">
        ·
      </span>
      <button
        type="button"
        aria-label={`Play from ${stamp}`}
        onClick={() => onSeek(startMs)}
        className="tnum rounded-tag text-meta text-accent underline underline-offset-2 hover:text-accent-hover"
      >
        {stamp}
      </button>
    </div>
  );
}
