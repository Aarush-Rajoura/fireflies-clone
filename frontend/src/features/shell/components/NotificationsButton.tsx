"use client";

import { Bell, BellOff } from "lucide-react";

import { IconButton, Popover } from "@/components/ui";

/** Bell + notifications panel. Real notifications arrive with the Home feed; until then it is empty. */
export function NotificationsButton() {
  return (
    <Popover
      align="end"
      label="Notifications"
      className="w-80 p-0"
      trigger={<IconButton label="Notifications" icon={<Bell strokeWidth={1.75} />} />}
    >
      <p className="border-b border-subtle px-4 py-3 text-body-strong text-strong">Notifications</p>
      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <BellOff className="size-6 text-muted" strokeWidth={1.75} aria-hidden />
        <p className="text-body-strong text-primary">You&apos;re all caught up</p>
        <p className="text-meta text-muted">
          New comments, shares and summaries will show up here.
        </p>
      </div>
    </Popover>
  );
}
