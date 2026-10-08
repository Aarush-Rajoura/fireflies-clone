"use client";

import {
  Check,
  ChevronRight,
  ExternalLink,
  Hash,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { AvatarGroup, Badge, IconButton, Menu, type MenuItem } from "@/components/ui";
import { TagChip } from "@/features/tags";
import type { MeetingListItem } from "@/lib/api";
import { cn } from "@/lib/utils/cn";
import { initials, speakerIndex } from "@/lib/utils/identity";

import { formatMeetingMeta } from "../lib/format";

export type ChannelOption = { id: number; name: string };

export type MeetingRowProps = {
  meeting: MeetingListItem;
  /** Targets for "Move to channel". */
  channels: readonly ChannelOption[];
  onOpen: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onMove: (id: number, channel: ChannelOption | null) => void;
  /** Injectable for tests; the viewer's zone otherwise. */
  timeZone?: string;
};

// Literal class names so Tailwind can see them; same buckets as <Avatar/>.
const tileFills = [
  "bg-avatar-0",
  "bg-avatar-1",
  "bg-avatar-2",
  "bg-avatar-3",
  "bg-avatar-4",
  "bg-avatar-5",
  "bg-avatar-6",
  "bg-avatar-7",
] as const;

const MAX_KEYWORDS = 3;
const MAX_TAGS = 2;
const SHOWN_AVATARS = 3;

function rowMenu(
  meeting: MeetingListItem,
  channels: readonly ChannelOption[],
  {
    onOpen,
    onEdit,
    onDelete,
    onMove,
  }: Pick<MeetingRowProps, "onOpen" | "onEdit" | "onDelete" | "onMove">,
): MenuItem[] {
  return [
    {
      label: "Open",
      icon: <ExternalLink strokeWidth={1.75} />,
      onSelect: () => onOpen(meeting.id),
    },
    { label: "Edit", icon: <Pencil strokeWidth={1.75} />, onSelect: () => onEdit(meeting.id) },
    { type: "separator" },
    { type: "label", label: "Move to channel" },
    ...channels.map((c) => ({
      label: c.name,
      icon: <Hash strokeWidth={1.75} />,
      trailing:
        c.id === meeting.channel_id ? (
          <Check aria-label="Current" className="size-3.5" />
        ) : undefined,
      disabled: c.id === meeting.channel_id,
      onSelect: () => onMove(meeting.id, c),
    })),
    ...(channels.length === 0
      ? [{ label: "No channels yet", disabled: true, onSelect: () => undefined }]
      : []),
    ...(meeting.channel_id !== null
      ? [{ label: "Remove from channel", onSelect: () => onMove(meeting.id, null) }]
      : []),
    { type: "separator" },
    {
      label: "Delete",
      icon: <Trash2 strokeWidth={1.75} />,
      danger: true,
      onSelect: () => onDelete(meeting.id),
    },
  ];
}

/**
 * One 82px library row. Purely presentational: data and actions arrive as
 * props, so a page of rows issues no requests of its own.
 */
export function MeetingRow({ meeting, channels, timeZone, ...actions }: MeetingRowProps) {
  const openItems = meeting.action_item_counts.open;
  const names = meeting.participants.map((p) => p.display_name);
  // The API embeds at most five participants; the count covers everyone.
  const hiddenParticipants = Math.max(
    0,
    meeting.participant_count - Math.min(names.length, SHOWN_AVATARS),
  );
  const itemsLabel = `${openItems} open action ${openItems === 1 ? "item" : "items"}`;

  const channelTag = meeting.channel && (
    <>
      <Hash aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0" />
      <span className="truncate">{meeting.channel.name}</span>
    </>
  );

  return (
    <article className="group relative flex h-[82px] items-center gap-3 rounded-panel px-4 transition-colors duration-fast focus-within:bg-surface-1 hover:bg-surface-1">
      <span
        aria-hidden
        className={cn(
          "flex size-avatar-lg shrink-0 items-center justify-center rounded-item text-body-strong text-on-accent",
          tileFills[speakerIndex(meeting.host.name)],
        )}
      >
        {initials(meeting.host.name)}
      </span>

      {/* The title column takes every spare pixel; everything to its right is fixed-size. */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="flex min-w-0 items-center gap-1 text-title-row text-primary">
            {/* Stretched link: the whole row opens the meeting, while the kebab stays its own control. */}
            <Link
              href={`/meetings/${meeting.id}`}
              className="truncate outline-none after:absolute after:inset-0 after:rounded-panel focus-visible:after:shadow-focus"
            >
              {meeting.title}
            </Link>
            <ChevronRight aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-muted" />
          </h3>
          {/* Gives way long before the title does; chips that don't fit drop out whole. */}
          {meeting.tags.length > 0 && (
            <ul
              aria-label="Tags"
              className="flex h-[18px] min-w-0 shrink-[1000] flex-wrap items-center gap-1 overflow-hidden"
            >
              {meeting.tags.slice(0, MAX_TAGS).map((tag) => (
                <li key={tag.id} className="flex">
                  <TagChip tag={tag} size="sm" className="max-w-[110px]" />
                </li>
              ))}
              {meeting.tags.length > MAX_TAGS && (
                <li
                  className="tnum text-caption text-muted"
                  title={meeting.tags
                    .slice(MAX_TAGS)
                    .map((t) => t.name)
                    .join(", ")}
                >
                  +{meeting.tags.length - MAX_TAGS}
                </li>
              )}
            </ul>
          )}
        </div>
        <p className="tnum flex min-w-0 items-center gap-1 text-meta text-muted">
          <span className="truncate">{formatMeetingMeta(meeting, timeZone)}</span>
          {/* Below 2xl the channel joins the meta line instead of taking a column; the meta truncates first. */}
          {channelTag && (
            <span className="flex min-w-0 max-w-[45%] shrink-0 items-center gap-1 text-accent 2xl:hidden">
              <span aria-hidden className="text-muted">
                ·
              </span>
              {channelTag}
            </span>
          )}
        </p>
      </div>

      {/* Wraps into a one-line-tall box, so chips that don't fit drop out whole instead of being cut. */}
      <div className="hidden h-[22px] min-w-0 max-w-[30%] flex-[0_1_auto] flex-wrap gap-1.5 overflow-hidden 2xl:flex">
        {meeting.keywords.slice(0, MAX_KEYWORDS).map((keyword) => (
          <span
            key={keyword}
            className="h-[22px] max-w-full truncate whitespace-nowrap rounded-tag bg-surface-3 px-1.5 py-0.5 text-caption text-secondary"
          >
            {keyword}
          </span>
        ))}
      </div>

      {channelTag && (
        <span className="hidden max-w-[140px] shrink-0 items-center gap-1 text-caption text-accent 2xl:flex">
          {channelTag}
        </span>
      )}

      {openItems > 0 && (
        <Badge
          tone="accent"
          className="shrink-0 gap-1 normal-case"
          aria-label={itemsLabel}
          title={itemsLabel}
        >
          <ListChecks aria-hidden strokeWidth={1.75} className="size-3.5" />
          {openItems}
        </Badge>
      )}

      <div className="flex shrink-0 items-center gap-1.5">
        {/* Rings take the row's colour, so overlapping avatars read as cut-outs on hover too. */}
        <AvatarGroup
          names={names.slice(0, SHOWN_AVATARS)}
          max={SHOWN_AVATARS}
          size="md"
          className="group-focus-within:[&>*]:ring-surface-1 group-hover:[&>*]:ring-surface-1"
        />
        {hiddenParticipants > 0 && (
          <span
            className="tnum text-caption text-muted"
            title={names.slice(SHOWN_AVATARS).join(", ") || undefined}
          >
            +{hiddenParticipants}
          </span>
        )}
      </div>

      {/* Overlays the row's right edge on hover, so it reserves no width. */}
      <div className="absolute right-3 top-1/2 z-[1] -translate-y-1/2 rounded-control bg-surface-1 opacity-0 shadow-hairline transition-opacity duration-fast focus-within:opacity-100 group-hover:opacity-100 has-[[data-state=open]]:opacity-100">
        <Menu
          trigger={
            <IconButton
              label={`Actions for ${meeting.title}`}
              size="sm"
              tooltip={false}
              icon={<MoreHorizontal strokeWidth={1.75} />}
            />
          }
          items={rowMenu(meeting, channels, actions)}
        />
      </div>
    </article>
  );
}
