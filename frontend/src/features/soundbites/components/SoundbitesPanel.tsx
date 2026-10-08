"use client";

import { Play, Scissors, Square, Trash2 } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog, EmptyState, IconButton, SidePanel, SkeletonRow } from "@/components/ui";
import type { Soundbite } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

import { useClipPlayer } from "../hooks/useClipPlayer";
import { useDeleteSoundbite, useSoundbites } from "../hooks/useSoundbites";
import { formatClipRange } from "../lib/range";

export type SoundbitesPanelProps = { meetingId: number; onClose: () => void };

/** The soundbites flyout: the meeting's clips in recording order, each playable on its own. */
export function SoundbitesPanel({ meetingId, onClose }: SoundbitesPanelProps) {
  const query = useSoundbites(meetingId);
  const remove = useDeleteSoundbite(meetingId);
  const player = useClipPlayer();
  const [deleting, setDeleting] = useState<Soundbite | null>(null);
  const clips = query.data ?? [];

  let body;
  if (query.isPending) {
    body = (
      <div role="status" aria-label="Loading soundbites" className="flex flex-col gap-3 p-4">
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  } else if (query.isError) {
    body = <EmptyState title="Couldn't load soundbites" description={query.error.message} />;
  } else if (clips.length === 0) {
    body = (
      <EmptyState
        icon={<Scissors strokeWidth={1.75} />}
        title="No soundbites yet"
        description="Select text in the transcript and choose Create soundbite to clip that moment."
      />
    );
  } else {
    body = (
      <ul aria-label="Soundbites" className="flex flex-col py-1">
        {clips.map((clip) => {
          const playing = player.playingId === clip.id;
          return (
            <li
              key={clip.id}
              className={cn(
                "group flex items-center gap-3 px-4 py-2.5 transition-colors duration-fast hover:bg-surface-hover",
                playing && "bg-accent-subtle",
              )}
            >
              <IconButton
                label={playing ? `Stop ${clip.title}` : `Play ${clip.title}`}
                tooltip={false}
                variant="secondary"
                size="sm"
                active={playing}
                icon={playing ? <Square strokeWidth={1.75} /> : <Play strokeWidth={1.75} />}
                onClick={() => (playing ? player.stop() : player.play(clip))}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body-strong text-primary" title={clip.title}>
                  {clip.title}
                </span>
                <span className="tnum text-caption text-muted">{formatClipRange(clip)}</span>
              </div>
              <IconButton
                label={`Delete ${clip.title}`}
                size="sm"
                tooltip={false}
                icon={<Trash2 strokeWidth={1.75} />}
                className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                onClick={() => setDeleting(clip)}
              />
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <SidePanel title="Soundbites" meta={clips.length} onClose={onClose}>
      {body}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete soundbite?"
        description={deleting ? `“${deleting.title}” will be removed for everyone.` : undefined}
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleting) {
            if (player.playingId === deleting.id) player.stop();
            remove.mutate(deleting.id);
          }
          setDeleting(null);
        }}
      />
    </SidePanel>
  );
}
