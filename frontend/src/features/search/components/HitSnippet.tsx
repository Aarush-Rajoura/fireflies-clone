import { Highlighter } from "@/components/ui";
import { formatTimestamp } from "@/features/transcript";
import type { SearchHit } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

/** One transcript hit: timestamp chip (in the transcript's own "00:53" format), speaker, and the snippet with matches marked. */
export function HitSnippet({ hit, clamp = false }: { hit: SearchHit; clamp?: boolean }) {
  return (
    <span className="flex min-w-0 items-start gap-3">
      <span className="tnum mt-0.5 shrink-0 rounded-tag bg-surface-3 px-1.5 text-caption text-secondary">
        {formatTimestamp(hit.start_ms)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-caption text-muted">{hit.speaker}</span>
        <Highlighter
          text={hit.snippet}
          ranges={hit.ranges}
          className={cn("block text-body text-primary", clamp && "line-clamp-2")}
        />
      </span>
    </span>
  );
}
