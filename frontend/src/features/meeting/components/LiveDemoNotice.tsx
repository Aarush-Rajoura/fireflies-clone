"use client";

import { Info, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

/** How long the demo pretends the bot is joining before admitting it cannot. */
export const LIVE_DEMO_WINDOW_MS = 60_000;

export function isJoiningPhase(startedAt: string, now: number): boolean {
  return now - new Date(startedAt).getTime() < LIVE_DEMO_WINDOW_MS;
}

/**
 * The body of a Captured (live) meeting. No real bot exists, so after a short
 * "joining" beat it says so and points at uploading a transcript instead.
 */
export function LiveDemoNotice({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  const joining = isJoiningPhase(startedAt, now);

  useEffect(() => {
    if (!joining) return;
    const wait = new Date(startedAt).getTime() + LIVE_DEMO_WINDOW_MS - Date.now();
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, wait));
    return () => clearTimeout(timer);
  }, [joining, startedAt]);

  return (
    <div
      role="status"
      className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-card border border-subtle bg-surface-1 px-6 py-10 text-center"
    >
      {joining ? (
        <Loader2
          className="size-8 text-accent motion-safe:animate-spin"
          strokeWidth={1.75}
          aria-hidden
        />
      ) : (
        <Info className="size-8 text-warning" strokeWidth={1.75} aria-hidden />
      )}
      <p className="text-h3 text-strong">
        {joining ? "Fred is joining… (demo)" : "Bot can't join in the demo"}
      </p>
      <p className="text-body text-secondary">
        {joining
          ? "In the real product Fred would join the call and transcribe it live."
          : "Upload a transcript instead to get a summary and action items."}
      </p>
    </div>
  );
}
