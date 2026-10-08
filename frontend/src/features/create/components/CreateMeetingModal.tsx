"use client";

import { useState } from "react";

import { useIsMutating } from "@tanstack/react-query";

import { Modal } from "@/components/ui";
import type { TranscriptPreview } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

import { useCreateMeeting } from "../hooks/useCreateMeeting";
import { PREVIEW_MUTATION_KEY } from "../lib/keys";
import { createErrorMessage } from "../lib/error-messages";
import { titleFromFileName } from "../lib/file-validation";
import { useCreateMeetingModal } from "../lib/modal-store";
import {
  buildMeetingCreate,
  participantsFromPreview,
  sourceForTab,
  type CreateTab,
  type MeetingDetails,
} from "../lib/payload";

import { CreateMeetingTabs, PANEL_ID, TAB_ID } from "./CreateMeetingTabs";
import { CreatingState } from "./CreatingState";
import { MediaComingSoon } from "./MediaComingSoon";
import { MeetingDetailsForm } from "./MeetingDetailsForm";
import { PastePanel } from "./PastePanel";
import { PreviewSummary } from "./PreviewSummary";
import { UploadDropzone } from "./UploadDropzone";

type Upload = { preview: TranscriptPreview; fileName: string };

/** The one create-meeting dialog; mount it once (the app shell does) and open it via the store. */
export function CreateMeetingModal() {
  const { isOpen, tab, close, setTab } = useCreateMeetingModal();
  const create = useCreateMeeting();
  const pending = create.isPending;

  const dismiss = () => {
    if (pending) return;
    create.reset();
    close();
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => !open && dismiss()}
      title="New meeting"
      description="Add a transcript and Fred writes the summary and action items."
      size="lg"
      dismissible={!pending}
    >
      {/* Mounted only while open, so every opening starts from a clean slate. */}
      {isOpen && (
        <CreateMeetingBody
          tab={tab}
          onTabChange={(next) => {
            if (create.isError) create.reset();
            setTab(next);
          }}
          pending={pending}
          withNotes={Boolean(create.variables?.segments)}
          error={create.isError ? createErrorMessage(create.error) : null}
          onSubmit={(details, preview) => {
            // A double click must not create the meeting twice.
            if (pending) return;
            create.mutate(buildMeetingCreate(details, sourceForTab(tab), preview));
          }}
          onCancel={dismiss}
        />
      )}
    </Modal>
  );
}

type BodyProps = {
  tab: CreateTab;
  onTabChange: (tab: CreateTab) => void;
  pending: boolean;
  withNotes: boolean;
  error: string | null;
  onSubmit: (details: MeetingDetails, preview: TranscriptPreview | null) => void;
  onCancel: () => void;
};

function CreateMeetingBody({
  tab,
  onTabChange,
  pending,
  withNotes,
  error,
  onSubmit,
  onCancel,
}: BodyProps) {
  const [upload, setUpload] = useState<Upload | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [pasted, setPasted] = useState<TranscriptPreview | null>(null);
  const previewing = useIsMutating({ mutationKey: PREVIEW_MUTATION_KEY }) > 0;

  const details = (preview: TranscriptPreview | null, initialTitle = "") => (
    <MeetingDetailsForm
      initialTitle={initialTitle}
      initialParticipants={participantsFromPreview(preview)}
      onSubmit={(d) => onSubmit(d, preview)}
      onCancel={onCancel}
      submitLabel="Create meeting"
      error={error}
    />
  );

  let panel;
  if (tab === "upload") {
    panel = upload ? (
      <div className="flex flex-col gap-5">
        <PreviewSummary
          preview={upload.preview}
          sourceName={upload.fileName}
          backLabel="Choose another file"
          onBack={() => setUpload(null)}
        />
        {details(upload.preview, titleFromFileName(upload.fileName))}
      </div>
    ) : (
      <UploadDropzone onPreview={(preview, file) => setUpload({ preview, fileName: file.name })} />
    );
  } else if (tab === "paste") {
    panel = pasted ? (
      <div className="flex flex-col gap-5">
        <PreviewSummary preview={pasted} backLabel="Edit text" onBack={() => setPasted(null)} />
        {details(pasted)}
      </div>
    ) : (
      <PastePanel text={pasteText} onTextChange={setPasteText} onPreview={setPasted} />
    );
  } else if (tab === "form") {
    panel = (
      <div className="flex flex-col gap-4">
        <p className="text-meta text-muted">
          No transcript yet? Create the meeting now and add notes later. Fred writes a summary only
          when there is a transcript.
        </p>
        {details(null)}
      </div>
    );
  } else {
    panel = <MediaComingSoon onUseTranscript={() => onTabChange("upload")} />;
  }

  return (
    <div className="flex flex-col gap-5">
      {pending && <CreatingState withNotes={withNotes} />}
      {/* Hidden, not unmounted, while creating: a failure brings the form back with its input. */}
      <div className={cn("flex flex-col gap-5", pending && "hidden")}>
        <CreateMeetingTabs tab={tab} onChange={onTabChange} locked={previewing} />
        <div role="tabpanel" id={`${PANEL_ID}-${tab}`} aria-labelledby={`${TAB_ID}-${tab}`}>
          {panel}
        </div>
      </div>
    </div>
  );
}
