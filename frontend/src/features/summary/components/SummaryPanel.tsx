"use client";

import { useMemo, useState, type ReactNode } from "react";

import { Skeleton, StateView, toast } from "@/components/ui";
import type { Summary } from "@/lib/api";

import { useRegenerateSummary } from "../hooks/useRegenerateSummary";
import { useSummary } from "../hooks/useSummary";
import { attachNoteRanges, buildChapters } from "../lib/chapters";
import {
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  isTemplateId,
  type SectionId,
  type TemplateId,
} from "../lib/templates";
import { summaryToMarkdown } from "../lib/to-markdown";
import { KeywordsSection } from "./KeywordsSection";
import { NotesSection } from "./NotesSection";
import { OutlineSection } from "./OutlineSection";
import { OverviewSection } from "./OverviewSection";
import { SummaryEmpty } from "./SummaryEmpty";
import { SummaryHeader } from "./SummaryHeader";
import { SummarySection } from "./SummarySection";

export type SummaryPanelProps = {
  meetingId: number;
  /** The meeting's length; closes the last chapter's time range. */
  durationMs: number;
  /** Rendered as the Action Items section; the page passes the action-items feature's list. */
  actionItemsSlot?: ReactNode;
  /** Used as the H1 of the copied Markdown. */
  meetingTitle?: string;
};

/** A summary that was never generated comes back with no timestamp and no content. */
export function isEmptySummary(s: Summary): boolean {
  return (
    s.generated_at === null &&
    !s.overview.trim() &&
    s.keywords.length === 0 &&
    s.outline.length === 0 &&
    s.notes.length === 0
  );
}

export function SummaryPanel({
  meetingId,
  durationMs,
  actionItemsSlot,
  meetingTitle,
}: SummaryPanelProps) {
  const query = useSummary(meetingId);
  const regenerate = useRegenerateSummary(meetingId);
  const [templateId, setTemplateId] = useState<TemplateId>(DEFAULT_TEMPLATE_ID);
  const summary = query.data;

  const chapters = useMemo(
    () => (summary ? buildChapters(summary.outline, durationMs) : []),
    [summary, durationMs],
  );
  const notes = useMemo(
    () => (summary ? attachNoteRanges(summary.notes, chapters) : []),
    [summary, chapters],
  );
  const empty = !summary || isEmptySummary(summary);

  const copy = async () => {
    if (!summary) return;
    const md = summaryToMarkdown(summary, {
      title: meetingTitle,
      durationMs,
      template: templateId,
    });
    try {
      await navigator.clipboard.writeText(md);
      toast.success("Summary copied as Markdown");
    } catch {
      toast.error("Couldn't copy to the clipboard");
    }
  };

  const renderSection = (id: SectionId, label: string, data: Summary): ReactNode => {
    switch (id) {
      case "keywords":
        return <KeywordsSection label={label} keywords={data.keywords} />;
      case "overview":
        return <OverviewSection label={label} overview={data.overview} />;
      case "outline":
        return <OutlineSection label={label} chapters={chapters} />;
      case "notes":
        return <NotesSection label={label} notes={notes} />;
      case "actionItems":
        return actionItemsSlot ? (
          <SummarySection label={label}>{actionItemsSlot}</SummarySection>
        ) : null;
    }
  };

  const template = getTemplate(templateId);

  return (
    <div className="flex flex-col gap-6">
      <SummaryHeader
        templateId={templateId}
        onTemplateChange={(id) => isTemplateId(id) && setTemplateId(id)}
        onCopy={() => void copy()}
        canCopy={!empty}
        provider={summary?.provider ?? null}
        model={summary?.model ?? null}
        generatedAt={summary?.generated_at ?? null}
        isStale={summary?.is_stale ?? false}
        onRegenerate={() => regenerate.mutate()}
        isRegenerating={regenerate.isPending}
      />
      <StateView
        query={query}
        isEmpty={isEmptySummary}
        errorMessage="We couldn't load this meeting's summary."
        loading={<SummarySkeleton />}
        empty={
          <>
            <SummaryEmpty
              onGenerate={() => regenerate.mutate()}
              isGenerating={regenerate.isPending}
            />
            {actionItemsSlot && (
              <SummarySection
                label={
                  template.sections.find((s) => s.id === "actionItems")?.label ?? "Action Items"
                }
              >
                {actionItemsSlot}
              </SummarySection>
            )}
          </>
        }
      >
        {(data) =>
          template.sections.map((s) => (
            <div key={s.id} data-section={s.id} className="contents">
              {renderSection(s.id, s.label, data)}
            </div>
          ))
        }
      </StateView>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-5 w-40" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-11/12" />
      <Skeleton className="h-3.5 w-3/4" />
    </div>
  );
}
