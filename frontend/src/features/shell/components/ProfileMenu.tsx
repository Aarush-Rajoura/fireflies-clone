"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import { Avatar, Popover, Pressable } from "@/components/ui";
import { useMe } from "@/features/user";
import { cn } from "@/lib/utils/cn";

import { AppCards, AccountPanel } from "./ProfilePanels";

/** Avatar button at the top of the rail and the two-column account menu it opens. */
export function ProfileMenu({ expanded = false }: { expanded?: boolean }) {
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const name = me?.name ?? "";
  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      // Below the 56px header row (trigger is 40px, centred), like the product: never over the top bar.
      side="bottom"
      align="start"
      sideOffset={12}
      label="Account menu"
      className="flex w-auto items-start gap-2 p-2"
      trigger={
        <Pressable
          bare
          type="button"
          aria-label="Open profile menu"
          className={cn(
            "flex h-10 items-center gap-2.5 rounded-panel text-body-strong text-primary hover:bg-surface-hover",
            expanded ? "min-w-0 flex-1 px-2" : "w-10 justify-center",
          )}
        >
          <Avatar
            name={name || "?"}
            src={me?.avatar_url ?? undefined}
            size="sm"
            className="rounded-tag ring-0"
          />
          {expanded && (
            <>
              <span className="truncate">{name}</span>
              <Chevron className="size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
            </>
          )}
        </Pressable>
      }
    >
      <AccountPanel name={name} email={me?.email ?? ""} onNavigate={() => setOpen(false)} />
      <AppCards />
    </Popover>
  );
}
