"use client";

import { Play } from "lucide-react";

import { Avatar, Modal, Pressable } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

/** The framed "Fireflies · Product Demo" still from the welcome banner. */
export function DemoThumbnail({ onPlay }: { onPlay: () => void }) {
  return (
    <Pressable
      onClick={onPlay}
      aria-label="Play the product demo"
      className="group relative block aspect-[250/170] w-full max-w-[252px] shrink-0 overflow-hidden rounded-card border-4 border-demo-frame bg-gradient-to-b from-demo-from to-demo-to"
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-3 bg-demo-to" />
      <span
        aria-hidden
        className="absolute inset-x-0 top-6 flex items-center justify-center gap-1.5 text-micro font-medium text-on-accent"
      >
        Fireflies
        <span className="size-2 rounded-tag bg-brand-mark" />
        Product Demo
      </span>
      {/* A faint app window behind the play button. */}
      <span
        aria-hidden
        className="absolute inset-x-6 bottom-0 top-14 rounded-t-panel border border-accent-subtle bg-accent-faint"
      />
      <span className="absolute left-1/2 top-1/2 flex h-10 w-[60px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent-text text-on-accent transition-transform duration-fast group-hover:scale-105">
        <Play className="size-4 fill-current" strokeWidth={1.75} aria-hidden />
      </span>
      <Avatar name="Fred Fireflies" size="md" className="absolute bottom-3 left-2" />
    </Pressable>
  );
}

// Literal class names so Tailwind can see them.
const ROWS = [
  { width: "w-3/4", fill: "bg-avatar-0" },
  { width: "w-1/2", fill: "bg-avatar-1" },
  { width: "w-2/3", fill: "bg-avatar-2" },
  { width: "w-5/12", fill: "bg-avatar-3" },
] as const;

/**
 * Stand-in for the real demo video (not shipped with the clone): a looping
 * sketch of a meeting being transcribed. Motion is skipped for users who ask
 * for reduced motion.
 */
export function DemoVideoModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Fireflies product demo"
      description="A two-minute tour: record, transcribe, summarise and search your meetings."
      size="lg"
    >
      <div
        role="img"
        aria-label="Animated preview of a meeting being transcribed"
        className="relative aspect-video overflow-hidden rounded-panel bg-gradient-to-b from-demo-from to-demo-to"
      >
        <div className="absolute inset-x-8 bottom-8 top-10 flex flex-col gap-4 rounded-panel border border-accent-subtle bg-surface-1 p-5">
          {ROWS.map(({ width, fill }, i) => (
            <div key={width} className="flex items-center gap-3">
              <span className={cn("size-6 shrink-0 rounded-full", fill)} />
              <span
                className={cn(
                  "block h-2 origin-left rounded-full bg-skeleton motion-safe:animate-demo-grow",
                  width,
                )}
                style={{ animationDelay: `${i * 0.6}s` }}
              />
            </div>
          ))}
          <div className="relative mt-auto h-1 overflow-hidden rounded-full bg-surface-3">
            <span className="absolute inset-y-0 left-0 w-1/4 rounded-full bg-accent motion-safe:animate-demo-sweep" />
          </div>
        </div>
        <p className="absolute inset-x-0 top-3 text-center text-caption text-on-accent">
          Demo preview
        </p>
      </div>
    </Modal>
  );
}
