"use client";

import { Bell, BellOff, CalendarCheck, FileText, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { IconButton, Popover, SkeletonRow, TextButton } from "@/components/ui";
import type { Notification } from "@/lib/api";
import { cn } from "@/lib/utils/cn";
import { relativeTime } from "@/lib/utils/relative-time";

import {
  hasUnread,
  useMarkAllRead,
  useMarkRead,
  useNotifications,
} from "../hooks/useNotifications";

const KIND_ICON: Record<Notification["kind"], React.ReactNode> = {
  meeting_created: <FileText strokeWidth={1.75} />,
  calendar_connected: <CalendarCheck strokeWidth={1.75} />,
  summary_regenerated: <Sparkles strokeWidth={1.75} />,
};

/** Top-bar bell: a red dot while anything is unread, the list in a popover. */
export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const query = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const unread = hasUnread(query.data);
  const items = query.data?.items ?? [];

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="end"
      label="Notifications"
      className="w-96 p-0"
      trigger={
        <IconButton
          label={unread ? "Notifications (unread)" : "Notifications"}
          icon={
            <>
              <Bell strokeWidth={1.75} />
              {/* Positioned against the button, which is `relative`. */}
              {unread && (
                <span
                  aria-hidden
                  data-testid="unread-dot"
                  className="pointer-events-none absolute right-1.5 top-1.5 size-2 rounded-full bg-danger ring-2 ring-surface-1"
                />
              )}
            </>
          }
        />
      }
    >
      <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
        <p className="text-body-strong text-strong">Notifications</p>
        <TextButton
          disabled={!unread || markAll.isPending}
          onClick={() => markAll.mutate()}
          className="text-meta"
        >
          Mark all read
        </TextButton>
      </div>
      {query.isLoading ? (
        <div role="status" aria-label="Loading notifications" className="p-3">
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <BellOff className="size-6 text-muted" strokeWidth={1.75} aria-hidden />
          <p className="text-body-strong text-primary">You&apos;re all caught up</p>
          <p className="text-meta text-muted">
            New meetings, calendar imports and summaries will show up here.
          </p>
        </div>
      ) : (
        <ul aria-label="Notification list" className="max-h-[420px] overflow-y-auto py-1">
          {items.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onOpen={() => {
                if (n.read_at === null) markRead.mutate(n.id);
                setOpen(false);
              }}
            />
          ))}
        </ul>
      )}
    </Popover>
  );
}

function NotificationRow({
  notification: n,
  onOpen,
}: {
  notification: Notification;
  onOpen: () => void;
}) {
  const isUnread = n.read_at === null;
  const body = (
    <>
      <span aria-hidden className="mt-0.5 flex text-secondary [&_svg]:size-4">
        {KIND_ICON[n.kind]}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "truncate text-body",
            isUnread ? "font-medium text-strong" : "text-secondary",
          )}
        >
          {n.title}
        </span>
        {n.body && <span className="line-clamp-2 text-meta text-muted">{n.body}</span>}
        <span className="text-caption text-muted">{relativeTime(n.created_at)}</span>
      </span>
      {isUnread && (
        <span className="mt-2 size-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />
      )}
    </>
  );
  const rowClass = "flex w-full items-start gap-3 px-4 py-2.5 hover:bg-surface-hover";
  return (
    <li>
      {n.link ? (
        <Link href={n.link} onClick={onOpen} className={rowClass}>
          {body}
        </Link>
      ) : (
        <div className={rowClass}>{body}</div>
      )}
    </li>
  );
}
