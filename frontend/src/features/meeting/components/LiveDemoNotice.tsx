"use client";

import { Info, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

/** How long the demo pretends the bot is joining before admitting it cannot. */
export const LIVE_DEMO_WINDOW_MS = 60_000;

export function isJoiningPhase(startedAt: string, now: number): boolean {
  return now - new Date(startedAt).getTime() < LIVE_DEMO_WINDOW_MS;
}

/** Shown on a Captured (live) meeting: no real bot exists, so say so after a short "joining" beat. */
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
      className="mx-6 mt-3 flex items-center gap-2 rounded-panel border border-subtle bg-surface-2 px-4 py-2.5 text-body text-secondary"
    >
      {joining ? (
        <>
          <Loader2
            className="size-4 text-accent motion-safe:animate-spin"
            strokeWidth={1.75}
            aria-hidden
          />
          Fred is joining… (demo)
        </>
      ) : (
        <>
          <Info className="size-4 text-warning" strokeWidth={1.75} aria-hidden />
          Bot can&apos;t join in the demo — upload a transcript instead.
        </>
      )}
    </div>
  );
}
