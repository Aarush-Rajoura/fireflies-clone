"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { ResizablePanels } from "@/components/ui";
import { ActionItemList } from "@/features/action-items";
import {
  PlayerCard,
  PlayerProvider,
  defaultCreateEngine,
  useInitialSeek,
  type CreateEngine,
} from "@/features/player";
import { SummaryPanel } from "@/features/summary";
import { useTranscript, type TranscriptPanelHandle } from "@/features/transcript";
import type { MeetingDetail, Segment } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

import { meetingMediaUrl } from "../api";
import { isMeetingDeleted, isMeetingNotFound, useMeeting } from "../hooks/useMeeting";
import { useNotepadFlyouts } from "../hooks/useNotepadFlyouts";
import { AnnotatedTranscript } from "./AnnotatedTranscript";
import { DeleteMeetingDialog } from "./DeleteMeetingDialog";
import { EditMeetingModal, type EditMode } from "./EditMeetingModal";
import { LiveDemoNotice } from "./LiveDemoNotice";
import {
  DeletedMeetingState,
  MeetingLoadError,
  MeetingNotFound,
  NotepadSkeleton,
} from "./MeetingStates";
import { NotepadHeader } from "./NotepadHeader";
import { NotepadSummarySide } from "./NotepadSummarySide";

const NO_SEGMENTS: Segment[] = [];

export type NotepadViewProps = {
  meetingId: number;
  /** Raw `?t=` deep link ("754", "12:34", "1h2m"); applied once the player is up. */
  t?: string;
  /** `?edit=1`: open the edit modal on arrival. */
  edit?: boolean;
  /** Test seam: swap the media engine. */
  createEngine?: CreateEngine;
};

/** The meeting page ("Notepad"). Fills the area under the top bar; only its columns scroll. */
export function NotepadView({ meetingId, t, edit = false, createEngine }: NotepadViewProps) {
  const query = useMeeting(meetingId);

  let body;
  // Error first: a refetch that comes back 410 keeps the old data, but the meeting is gone.
  if (query.isError && isMeetingDeleted(query.error)) {
    body = <DeletedMeetingState meetingId={meetingId} />;
  } else if (query.isError && isMeetingNotFound(query.error)) {
    body = <MeetingNotFound />;
  } else if (query.data) {
    body = <LoadedNotepad meeting={query.data} t={t} edit={edit} createEngine={createEngine} />;
  } else if (query.isError) {
    body = <MeetingLoadError message={query.error.message} onRetry={() => void query.refetch()} />;
  } else {
    body = <NotepadSkeleton />;
  }

  return <div className="flex h-full min-h-0 flex-col overflow-hidden">{body}</div>;
}

function DeepLink({ t }: { t?: string }) {
  useInitialSeek(t);
  return null;
}

function LoadedNotepad({
  meeting,
  t,
  edit,
  createEngine = defaultCreateEngine,
}: {
  meeting: MeetingDetail;
  t?: string;
  edit: boolean;
  createEngine?: CreateEngine;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [playerVisible, setPlayerVisible] = useState(true);
  const [editMode, setEditMode] = useState<EditMode | null>(edit ? "edit" : null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const flyouts = useNotepadFlyouts();
  const transcript = useRef<TranscriptPanelHandle>(null);
  const segments = useTranscript(meeting.id).data?.segments ?? NO_SEGMENTS;

  const participants = useMemo(
    () => meeting.participants.map((p) => ({ id: p.id, display_name: p.display_name })),
    [meeting.participants],
  );

  const closeEdit = () => {
    setEditMode(null);
    // Drop only `edit`, so a reload does not reopen the modal; `t` and the rest stay.
    if (!searchParams?.has("edit")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    const qs = params.toString();
    const base = pathname ?? `/meetings/${meeting.id}`;
    router.replace(qs ? `${base}?${qs}` : base, { scroll: false });
  };

  return (
    <PlayerProvider
      mediaUrl={meeting.has_media ? meetingMediaUrl(meeting.id) : null}
      durationMs={meeting.duration_ms}
      createEngine={createEngine}
    >
      <DeepLink t={t} />
      <NotepadHeader
        meeting={meeting}
        playerVisible={playerVisible}
        onTogglePlayer={() => setPlayerVisible((v) => !v)}
        askOpen={flyouts.open === "ai"}
        onToggleAsk={() => flyouts.toggle("ai")}
        askPanelId={flyouts.askPanelId}
        onEdit={() => setEditMode("edit")}
        onMove={() => setEditMode("move")}
        onDelete={() => setDeleteOpen(true)}
      />
      {meeting.status === "live" && <LiveDemoNotice startedAt={meeting.started_at} />}
      <div className="min-h-0 flex-1">
        <ResizablePanels
          defaultSize={55}
          minSize={35}
          maxSize={65}
          storageKey="notepad.split"
          label="Resize summary and transcript"
          start={
            <NotepadSummarySide
              meetingId={meeting.id}
              meetingTitle={meeting.title}
              segments={segments}
              flyouts={flyouts}
              onSearch={() => transcript.current?.focusFind()}
            >
              <div className="px-8 pb-10 pt-5">
                <SummaryPanel
                  meetingId={meeting.id}
                  durationMs={meeting.duration_ms}
                  meetingTitle={meeting.title}
                  actionItemsSlot={
                    <ActionItemList meetingId={meeting.id} participants={participants} />
                  }
                />
              </div>
            </NotepadSummarySide>
          }
          end={
            <div className="flex h-full min-h-0 flex-col">
              {/* Hidden, not unmounted: playback and keyboard shortcuts carry on. */}
              <div className={cn("shrink-0 px-4 pt-4", !playerVisible && "hidden")}>
                <PlayerCard />
              </div>
              <div className="min-h-0 flex-1">
                <AnnotatedTranscript
                  meeting={meeting}
                  segments={segments}
                  handleRef={transcript}
                  onCommentLine={flyouts.focusComments}
                  onSoundbiteCreated={() => flyouts.show("soundbites")}
                />
              </div>
            </div>
          }
        />
      </div>
      <EditMeetingModal meeting={meeting} mode={editMode} onClose={closeEdit} />
      <DeleteMeetingDialog
        meetingId={meeting.id}
        title={meeting.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </PlayerProvider>
  );
}
