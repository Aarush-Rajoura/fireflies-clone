"use client";

import { Files, Hash, Plus, Upload } from "lucide-react";
import { useState } from "react";

import { Badge, Button, SearchInput, Skeleton } from "@/components/ui";
import { NavItem } from "@/components/ui/nav-item";
import type { Channel } from "@/lib/api";

import { useChannels } from "../hooks/useChannels";

import { ChannelMenu } from "./ChannelMenu";
import { CreateChannelModal } from "./CreateChannelModal";

/** The built-in views; each maps to the list's `scope`. */
export type ChannelScope = "hosted" | "all" | "uploads";

export type ChannelSidebarProps = {
  /** The list's current scope, used when no channel is selected. */
  activeScope: string;
  activeChannelId?: number;
  onSelectScope: (scope: ChannelScope) => void;
  onSelectChannel: (id: number) => void;
  /** Lets the caller leave a view whose channel no longer exists. */
  onChannelDeleted?: (id: number) => void;
};

/**
 * The Meetings hub's left column: built-in views, then the user's channels.
 * Selection is owned by the caller (the URL), so this only reports clicks.
 */
export function ChannelSidebar({
  activeScope,
  activeChannelId,
  onSelectScope,
  onSelectChannel,
  onChannelDeleted,
}: ChannelSidebarProps) {
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const channels = useChannels();
  const scopeActive = (scope: ChannelScope) =>
    activeChannelId === undefined && activeScope === scope;

  const needle = filter.trim().toLowerCase();
  const shown = (channels.data ?? []).filter((c) => c.name.toLowerCase().includes(needle));

  return (
    <aside
      aria-label="Channels"
      className="flex w-sidebar shrink-0 flex-col overflow-y-auto border-r border-subtle bg-surface-1"
    >
      <div className="p-3">
        <SearchInput
          label="Search channels"
          placeholder="Search channels"
          value={filter}
          onValueChange={setFilter}
          debounceMs={0}
        />
      </div>

      <nav
        aria-label="Meeting views"
        className="flex flex-col gap-1 border-b border-subtle px-3 pb-5"
      >
        <NavItem
          label="My Meetings"
          icon={<Hash strokeWidth={1.75} />}
          active={scopeActive("hosted")}
          onClick={() => onSelectScope("hosted")}
        />
        <NavItem
          label="All Meetings"
          icon={<Files strokeWidth={1.75} />}
          active={scopeActive("all")}
          onClick={() => onSelectScope("all")}
        />
        <NavItem
          label="Uploads"
          icon={<Upload strokeWidth={1.75} />}
          active={scopeActive("uploads")}
          onClick={() => onSelectScope("uploads")}
          badge={<Badge tone="success">New</Badge>}
        />
      </nav>

      <section aria-labelledby="all-channels" className="flex flex-col gap-1 px-3 pb-4 pt-7">
        <h2 id="all-channels" className="px-3 pb-3 text-body-strong text-primary">
          All channels
        </h2>
        {channels.isLoading ? (
          <div aria-label="Loading channels" role="status" className="flex flex-col gap-2 px-3">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-2/5" />
          </div>
        ) : channels.isError ? (
          <p className="px-3 text-meta text-muted">
            Couldn&apos;t load channels.{" "}
            <Button variant="ghost" size="sm" onClick={() => channels.refetch()}>
              Retry
            </Button>
          </p>
        ) : (channels.data ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-3 py-2 text-center">
            <Hash aria-hidden strokeWidth={1.75} className="size-6 text-accent" />
            <p className="text-body text-primary">Create channels to organize your conversations</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {shown.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                active={activeChannelId === channel.id}
                onSelect={() => onSelectChannel(channel.id)}
                onDeleted={onChannelDeleted}
              />
            ))}
            {shown.length === 0 && (
              <li className="px-3 py-2 text-meta text-muted">
                No channels match “{filter.trim()}”.
              </li>
            )}
          </ul>
        )}
        <div className="flex justify-center pt-3">
          <Button leadingIcon={<Plus strokeWidth={1.75} />} onClick={() => setCreating(true)}>
            Channel
          </Button>
        </div>
      </section>

      <CreateChannelModal
        open={creating}
        onOpenChange={setCreating}
        onCreated={(channel) => onSelectChannel(channel.id)}
      />
    </aside>
  );
}

function ChannelItem({
  channel,
  active,
  onSelect,
  onDeleted,
}: {
  channel: Channel;
  active: boolean;
  onSelect: () => void;
  onDeleted?: (id: number) => void;
}) {
  return (
    <li className="group relative flex items-center">
      <NavItem
        label={channel.name}
        icon={<Hash strokeWidth={1.75} />}
        active={active}
        onClick={onSelect}
        className="pr-10"
        trailing={
          <span className="tnum text-caption text-muted group-focus-within:invisible group-hover:invisible">
            {channel.meeting_count}
          </span>
        }
      />
      <span className="absolute right-1.5 opacity-0 transition-opacity duration-fast focus-within:opacity-100 group-hover:opacity-100 has-[[data-state=open]]:opacity-100">
        <ChannelMenu channel={channel} onDeleted={onDeleted} />
      </span>
    </li>
  );
}
