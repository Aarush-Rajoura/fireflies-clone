"use client";

import { Files, Hash, Plus, Upload } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Badge, Button, SearchInput, Skeleton } from "@/components/ui";
import type { Channel } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

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

const itemBase =
  "group flex h-10 w-full items-center gap-3 rounded-item px-3 text-left text-body transition-colors duration-fast [&_svg]:size-4 [&_svg]:shrink-0";
const itemLook = (active: boolean) =>
  active
    ? "bg-accent-subtle text-accent"
    : "text-secondary hover:bg-surface-hover hover:text-primary";

function ViewItem(props: {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
  badge?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-current={props.active ? "page" : undefined}
      onClick={props.onClick}
      className={cn(itemBase, itemLook(props.active))}
    >
      {props.icon}
      <span className="truncate">{props.label}</span>
      {props.badge}
    </button>
  );
}

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
        className="flex flex-col gap-1 border-b border-subtle px-3 pb-4"
      >
        <ViewItem
          label="My Meetings"
          icon={<Hash strokeWidth={1.75} />}
          active={scopeActive("hosted")}
          onClick={() => onSelectScope("hosted")}
        />
        <ViewItem
          label="All Meetings"
          icon={<Files strokeWidth={1.75} />}
          active={scopeActive("all")}
          onClick={() => onSelectScope("all")}
        />
        <ViewItem
          label="Uploads"
          icon={<Upload strokeWidth={1.75} />}
          active={scopeActive("uploads")}
          onClick={() => onSelectScope("uploads")}
          badge={<Badge tone="success">New</Badge>}
        />
      </nav>

      <section aria-labelledby="all-channels" className="flex flex-col gap-1 px-3 py-4">
        <h2 id="all-channels" className="px-3 pb-2 text-body-strong text-primary">
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
            <button
              type="button"
              className="text-accent hover:underline"
              onClick={() => channels.refetch()}
            >
              Retry
            </button>
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
    <li className={cn("group relative flex items-center rounded-item", itemLook(active))}>
      <button
        type="button"
        aria-current={active ? "page" : undefined}
        onClick={onSelect}
        className={cn(itemBase, "pr-10 hover:bg-transparent")}
      >
        <Hash strokeWidth={1.75} />
        <span className="truncate">{channel.name}</span>
        <span className="tnum ml-auto text-caption text-muted group-hover:invisible group-focus-within:invisible">
          {channel.meeting_count}
        </span>
      </button>
      <span className="absolute right-1.5 opacity-0 transition-opacity duration-fast focus-within:opacity-100 group-hover:opacity-100 has-[[data-state=open]]:opacity-100">
        <ChannelMenu channel={channel} onDeleted={onDeleted} />
      </span>
    </li>
  );
}
