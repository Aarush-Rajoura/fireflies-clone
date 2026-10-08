"use client";

import { AlertCircle, FileText } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

import { Button, EmptyState, Skeleton } from "@/components/ui";
import { usePlayerControls } from "@/features/player";
import type { Segment, Speaker } from "@/lib/api";

import { useRenameSpeaker } from "../hooks/useRenameSpeaker";
import { isTranscriptUnavailable, useTranscript } from "../hooks/useTranscript";
import { useTranscriptFind } from "../hooks/useTranscriptFind";
import type { Match } from "../lib/find-matches";
import { scrollRowIntoView } from "../lib/scroll";
import { FindBar } from "./FindBar";
import { RenameSpeakerModal } from "./RenameSpeakerModal";
import { TranscriptList, type TranscriptListHandle } from "./TranscriptList";

export type TranscriptPanelProps = { meetingId: number };

/**
 * The meeting page's transcript column. Must sit inside <PlayerProvider>.
 * A 404/410 renders nothing: the page owns "meeting deleted / not found"
 * (check with `isTranscriptGone` / `isTranscriptUnavailable`).
 */
export function TranscriptPanel({ meetingId }: TranscriptPanelProps) {
  const query = useTranscript(meetingId);
  if (query.isError && isTranscriptUnavailable(query.error)) return null;

  let body;
  if (query.isPending) {
    body = <TranscriptSkeleton />;
  } else if (query.isError) {
    body = (
      <EmptyState
        icon={<AlertCircle strokeWidth={1.75} />}
        title="Couldn't load the transcript"
        description={query.error.message}
        action={
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Try again
          </Button>
        }
      />
    );
  } else if (query.data.segments.length === 0) {
    body = (
      <EmptyState
        icon={<FileText strokeWidth={1.75} />}
        title="No transcript yet"
        description="Lines will appear here once the meeting has been transcribed."
      />
    );
  } else {
    body = (
      <LoadedTranscript
        meetingId={meetingId}
        segments={query.data.segments}
        speakers={query.data.speakers}
      />
    );
  }

  return (
    <section aria-label="Transcript" className="flex h-full min-h-0 flex-col">
      <h2 className="px-4 pb-2 pt-3 text-body-strong text-strong">Transcript</h2>
      {body}
    </section>
  );
}

function LoadedTranscript({
  meetingId,
  segments,
  speakers,
}: {
  meetingId: number;
  segments: Segment[];
  speakers: Speaker[];
}) {
  const { seek } = usePlayerControls();
  const find = useTranscriptFind(segments);
  const rename = useRenameSpeaker(meetingId);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listHandle = useRef<TranscriptListHandle>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Seek exactly once, here in the event handler that chose the match.
  const goTo = (match: Match | undefined) => {
    if (!match) return;
    const segment = segments[match.segmentIndex];
    listHandle.current?.followFrom(match.segmentIndex);
    if (segment) seek(segment.start_ms);
    scrollRowIntoView(listRef.current, match.segmentIndex);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // The rename modal is portalled: its keys bubble here through React but are not "in the panel".
    if (!e.currentTarget.contains(e.target as Node)) return;
    if (e.key.toLowerCase() === "f" && (e.ctrlKey || e.metaKey) && !e.altKey) {
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  };

  return (
    // Ctrl/Cmd+F is only claimed while focus is inside the panel; elsewhere the browser keeps it.
    <div onKeyDown={onKeyDown} className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pb-2">
        <FindBar
          ref={inputRef}
          query={find.query}
          onQueryChange={find.setQuery}
          total={find.matches.length}
          current={find.current}
          onNext={() => goTo(find.next())}
          onPrev={() => goTo(find.prev())}
          onClose={() => {
            find.clear();
            listRef.current?.focus();
          }}
        />
      </div>
      <TranscriptList
        handleRef={listHandle}
        segments={segments}
        speakers={speakers}
        scrollRef={listRef}
        onRename={setRenamingId}
        matches={find.bySegment}
        currentMatch={find.currentMatch}
        currentMatchIndex={find.current}
      />
      <RenameSpeakerModal
        speaker={speakers.find((s) => s.id === renamingId) ?? null}
        onClose={() => setRenamingId(null)}
        onSubmit={(speakerId, name) => rename.mutate({ speakerId, name })}
      />
    </div>
  );
}

function TranscriptSkeleton() {
  return (
    <div role="status" aria-label="Loading transcript" className="flex flex-col gap-6 px-4 py-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-avatar-sm" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="ml-8 h-3 w-11/12" />
          <Skeleton className={i % 2 ? "ml-8 h-3 w-2/3" : "ml-8 h-3 w-4/5"} />
        </div>
      ))}
    </div>
  );
}
