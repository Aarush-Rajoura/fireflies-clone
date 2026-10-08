"use client";

import { ArrowDownToLine } from "lucide-react";

import { Button } from "@/components/ui";

/** Floating pill shown while auto-follow is paused because the user scrolled away. */
export function JumpToCurrent({ onClick }: { onClick: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
      <Button
        size="sm"
        variant="primary"
        onClick={onClick}
        leadingIcon={<ArrowDownToLine strokeWidth={1.75} />}
        className="pointer-events-auto rounded-full shadow-popover animate-fade-in"
      >
        Jump to current
      </Button>
    </div>
  );
}
