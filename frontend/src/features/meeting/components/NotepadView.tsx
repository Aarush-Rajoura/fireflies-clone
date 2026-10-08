"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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
import { TranscriptPanel } from "@/features/transcript";
import type { MeetingDetail } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

import { meetingMediaUrl } from "../api";
import { isMeetingDeleted, isMeetingNotFound, useMeeting } from "../hooks/useMeeting";
import { DeleteMeetingDialog } from "./DeleteMeetingDialog";
import { EditMeetingModal, type EditMode } from "./EditMeetingModal";
import {
  DeletedMeetingState,
  MeetingLoadError,
  MeetingNotFound,
  NotepadSkeleton,
} from "./MeetingStates";
import { NotepadHeader } from "./NotepadHeader";

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
  const [playerVisible, setPlayerVisible] = useState(true);
  const [editMode, setEditMode] = useState<EditMode | null>(edit ? "edit" : null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const participants = useMemo(
    () => meeting.participants.map((p) => ({ id: p.id, display_name: p.display_name })),
    [meeting.participants],
  );

  const closeEdit = () => {
    setEditMode(null);
    // Drop `?edit=1` so a reload or a shared link does not reopen the modal.
    if (edit) router.replace(pathname ?? `/meetings/${meeting.id}`, { scroll: false });
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
        onEdit={() => setEditMode("edit")}
        onMove={() => setEditMode("move")}
        onDelete={() => setDeleteOpen(true)}
      />
      <div className="min-h-0 flex-1">
        <ResizablePanels
          defaultSize={55}
          minSize={35}
          maxSize={65}
          storageKey="notepad.split"
          label="Resize summary and transcript"
          start={
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
          }
          end={
            <div className="flex h-full min-h-0 flex-col">
              {/* Hidden, not unmounted: playback and keyboard shortcuts carry on. */}
              <div className={cn("shrink-0 px-4 pt-4", !playerVisible && "hidden")}>
                <PlayerCard />
              </div>
              <div className="min-h-0 flex-1">
                <TranscriptPanel meetingId={meeting.id} />
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
