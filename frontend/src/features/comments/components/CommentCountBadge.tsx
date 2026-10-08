"use client";

import { MessageSquare } from "lucide-react";

import { Button } from "@/components/ui";

export type CommentCountBadgeProps = { count: number; onClick: () => void };

/** The small "💬 2" marker on a transcript line that opens that line's thread. */
export function CommentCountBadge({ count, onClick }: CommentCountBadgeProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`${count} ${count === 1 ? "comment" : "comments"} on this line`}
      leadingIcon={<MessageSquare strokeWidth={1.75} />}
      onClick={onClick}
      className="tnum h-6 gap-1 px-1.5 text-caption text-accent [&_svg]:size-3.5"
    >
      {count}
    </Button>
  );
}
