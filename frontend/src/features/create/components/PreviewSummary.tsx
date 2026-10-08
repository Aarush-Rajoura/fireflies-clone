import { AlertTriangle, ArrowLeft, Clock, FileText, ListOrdered, Users } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Button } from "@/components/ui";
import type { TranscriptPreview } from "@/lib/api";

import { firstLines, formatClock, formatLabel, PREVIEW_LINES } from "../lib/preview-format";

export type PreviewSummaryProps = {
  preview: TranscriptPreview;
  /** e.g. the uploaded file's name; absent for pasted text. */
  sourceName?: string;
  onBack: () => void;
  backLabel: string;
};

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-item bg-surface-2 px-3 py-2">
      <span className="flex items-center gap-1.5 text-caption text-muted [&_svg]:size-3.5">
        {icon}
        {label}
      </span>
      <span className="tnum text-body-strong text-primary">{value}</span>
    </div>
  );
}

/** What the parser found, so the user can confirm before Fred spends time on notes. */
export function PreviewSummary({ preview, sourceName, onBack, backLabel }: PreviewSummaryProps) {
  const lines = firstLines(preview.segments);
  return (
    <section aria-label="Transcript preview" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Badge tone="success">Transcript read</Badge>
          <span className="truncate text-meta text-secondary">{sourceName ?? "Pasted text"}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          leadingIcon={<ArrowLeft strokeWidth={1.75} />}
          onClick={onBack}
        >
          {backLabel}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          icon={<FileText strokeWidth={1.75} />}
          label="Format"
          value={formatLabel(preview.format)}
        />
        <Stat
          icon={<Users strokeWidth={1.75} />}
          label="Speakers"
          value={preview.speakers.length}
        />
        <Stat
          icon={<ListOrdered strokeWidth={1.75} />}
          label="Lines"
          value={preview.segment_count}
        />
        <Stat
          icon={<Clock strokeWidth={1.75} />}
          label={preview.timings_estimated ? "Duration (est.)" : "Duration"}
          value={formatClock(preview.duration_ms)}
        />
      </div>

      {preview.warnings.length > 0 && (
        <ul
          aria-label="Warnings"
          className="flex flex-col gap-1 rounded-item border border-warning bg-warning-subtle px-3 py-2 text-meta text-warning-strong"
        >
          {preview.warnings.map((warning) => (
            <li key={warning} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} />
              {warning}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-label text-secondary">
          First {Math.min(PREVIEW_LINES, preview.segment_count)} of {preview.segment_count} lines
        </span>
        <ol className="flex flex-col gap-1.5 rounded-item border border-subtle bg-surface-sunken px-3 py-2">
          {lines.map((segment, i) => (
            <li key={i} className="flex gap-3 text-meta">
              <span className="tnum w-10 shrink-0 text-muted">{formatClock(segment.start_ms)}</span>
              <span className="line-clamp-2 min-w-0 text-secondary">
                <span className="font-medium text-primary">{segment.speaker}:</span> {segment.text}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
