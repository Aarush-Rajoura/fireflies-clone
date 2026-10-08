"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog, IconButton, Menu } from "@/components/ui";
import type { Channel } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

import { useDeleteChannel } from "../hooks/useChannelMutations";

import { CreateChannelModal } from "./CreateChannelModal";

export type ChannelMenuProps = {
  channel: Channel;
  onDeleted?: (id: number) => void;
  className?: string;
};

/** Per-channel kebab: rename, delete (confirmed: unlike a meeting, a channel has no undo). */
export function ChannelMenu({ channel, onDeleted, className }: ChannelMenuProps) {
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteChannel();

  return (
    <>
      <Menu
        trigger={
          <IconButton
            label={`Options for ${channel.name}`}
            size="sm"
            tooltip={false}
            icon={<MoreHorizontal strokeWidth={1.75} />}
            className={cn("size-7", className)}
          />
        }
        items={[
          {
            label: "Rename",
            icon: <Pencil strokeWidth={1.75} />,
            onSelect: () => setRenaming(true),
          },
          {
            label: "Delete",
            icon: <Trash2 strokeWidth={1.75} />,
            danger: true,
            onSelect: () => setConfirming(true),
          },
        ]}
      />
      <CreateChannelModal open={renaming} onOpenChange={setRenaming} channel={channel} />
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete #${channel.name}?`}
        description="Its meetings are kept and stay in All Meetings; only the channel goes."
        confirmLabel="Delete channel"
        danger
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(channel.id, {
            onSuccess: () => {
              setConfirming(false);
              onDeleted?.(channel.id);
            },
          })
        }
      />
    </>
  );
}
