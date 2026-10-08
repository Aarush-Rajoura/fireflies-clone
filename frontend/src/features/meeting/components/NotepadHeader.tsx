"use client";

import {
  FolderInput,
  Globe,
  Headphones,
  Link2,
  MoreHorizontal,
  Pencil,
  Timer,
  Trash2,
  Video,
} from "lucide-react";
import Link from "next/link";

import { AvatarGroup, Badge, Button, IconButton, Menu, toast } from "@/components/ui";
import { useComingSoon } from "@/features/shell";
import type { MeetingDetail } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

import {
  STATUS_BADGE,
  attendeeLabel,
  attendeeNames,
  formatDuration,
  formatMeetingDate,
} from "../lib/format";

export type NotepadHeaderProps = {
  meeting: MeetingDetail;
  playerVisible: boolean;
  onTogglePlayer: () => void;
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
};

/**
 * Two rows: breadcrumb + actions, then the title with attendees and when.
 * Every text run is `truncate` inside a `min-w-0` flex item, so a long title or
 * channel shrinks with an ellipsis instead of pushing the actions off-screen.
 */
export function NotepadHeader({
  meeting,
  playerVisible,
  onTogglePlayer,
  onEdit,
  onMove,
  onDelete,
}: NotepadHeaderProps) {
  const soon = useComingSoon();
  const status = STATUS_BADGE[meeting.status];
  const names = attendeeNames(meeting);
  const { date, time } = formatMeetingDate(meeting.started_at);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/meetings/${meeting.id}`);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  return (
    <header className="flex shrink-0 flex-col gap-3 border-b border-subtle bg-surface-1 px-6 pb-3 pt-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-meta">
          <Link
            href="/meetings"
            className="max-w-[40%] shrink-0 truncate text-secondary hover:text-primary"
          >
            # {meeting.channel?.name ?? "My Meetings"}
          </Link>
          <span aria-hidden className="text-muted">
            /
          </span>
          <span aria-current="page" className="min-w-0 truncate text-primary">
            {meeting.title}
          </span>
          <Badge tone={status.tone} className="ml-1">
            {status.label}
          </Badge>
        </nav>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="primary"
            size="sm"
            leadingIcon={<Globe strokeWidth={1.75} />}
            onClick={() =>
              soon.show({
                title: "Share",
                message: "Sharing meetings with teammates and guests is coming soon.",
              })
            }
          >
            Share
          </Button>
          <IconButton
            size="sm"
            label="Copy link"
            icon={<Link2 strokeWidth={1.75} />}
            onClick={() => void copyLink()}
          />
          <Menu
            items={[
              { label: "Edit", icon: <Pencil strokeWidth={1.75} />, onSelect: onEdit },
              {
                label: "Move to channel",
                icon: <FolderInput strokeWidth={1.75} />,
                onSelect: onMove,
              },
              { type: "separator" },
              {
                label: "Delete",
                icon: <Trash2 strokeWidth={1.75} />,
                onSelect: onDelete,
                danger: true,
              },
            ]}
            trigger={
              <IconButton
                size="sm"
                label="More actions"
                tooltip={false}
                icon={<MoreHorizontal strokeWidth={1.75} />}
              />
            }
          />
        </div>
      </div>

      <div className="flex min-w-0 items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h1 className="truncate text-h2 text-strong" title={meeting.title}>
            {meeting.title}
          </h1>
          <div className="flex min-w-0 items-center gap-2 text-meta text-secondary">
            <AvatarGroup names={names} max={3} size="sm" className="shrink-0" />
            <span className="min-w-0 truncate" title={names.join(", ")}>
              {attendeeLabel(names)}
            </span>
            <span aria-hidden className="text-muted">
              ·
            </span>
            <span className="tnum shrink-0 whitespace-nowrap">
              {date} · {time}
            </span>
            <span aria-hidden className="text-muted">
              ·
            </span>
            <span className="tnum inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
              <Timer aria-hidden className="size-3.5" strokeWidth={1.75} />
              {formatDuration(meeting.duration_ms)}
            </span>
          </div>
        </div>
        <MediaToggle
          mediaType={meeting.media_type}
          pressed={playerVisible}
          onClick={onTogglePlayer}
        />
      </div>
      {soon.dialog}
    </header>
  );
}

function MediaToggle({
  mediaType,
  pressed,
  onClick,
}: {
  mediaType: MeetingDetail["media_type"];
  pressed: boolean;
  onClick: () => void;
}) {
  const label = mediaType === "video" ? "Video" : mediaType === "audio" ? "Audio" : "Player";
  const Icon = mediaType === "video" ? Video : Headphones;
  return (
    <Button
      variant="secondary"
      size="sm"
      aria-pressed={pressed}
      title={pressed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
      leadingIcon={<Icon strokeWidth={1.75} />}
      onClick={onClick}
      className={cn("mt-0.5", pressed && "border-accent-border text-accent")}
    >
      {label}
    </Button>
  );
}
