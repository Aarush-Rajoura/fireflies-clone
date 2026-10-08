"use client";

import { ClipboardPaste, FileUp, Film, PencilLine } from "lucide-react";
import { useState } from "react";

import { Modal, SegmentedControl, SoonBadge, type SegmentedOption } from "@/components/ui";
import type { TranscriptPreview } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

import { useCreateMeeting } from "../hooks/useCreateMeeting";
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

import { CreatingState } from "./CreatingState";
import { MediaComingSoon } from "./MediaComingSoon";
import { MeetingDetailsForm } from "./MeetingDetailsForm";
import { PastePanel } from "./PastePanel";
import { PreviewSummary } from "./PreviewSummary";
import { UploadDropzone } from "./UploadDropzone";

const TABS: readonly SegmentedOption<CreateTab>[] = [
  {
    value: "upload",
    label: (
      <>
        <FileUp className="size-4" strokeWidth={1.75} />
        Upload transcript
      </>
    ),
  },
  {
    value: "paste",
    label: (
      <>
        <ClipboardPaste className="size-4" strokeWidth={1.75} />
        Paste
      </>
    ),
  },
  {
    value: "form",
    label: (
      <>
        <PencilLine className="size-4" strokeWidth={1.75} />
        Form
      </>
    ),
  },
  {
    value: "media",
    label: (
      <>
        <Film className="size-4" strokeWidth={1.75} />
        Upload audio/video
        <SoonBadge />
      </>
    ),
  },
];

const TAB_ID = "create-meeting-tab";

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
          onSubmit={(details, preview) =>
            create.mutate(buildMeetingCreate(details, sourceForTab(tab), preview))
          }
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
        <div className="-mx-1 overflow-x-auto px-1">
          <SegmentedControl
            label="How to add the meeting"
            options={TABS}
            value={tab}
            onChange={onTabChange}
            idPrefix={TAB_ID}
          />
        </div>
        <div role="tabpanel" aria-labelledby={`${TAB_ID}-${tab}`}>
          {panel}
        </div>
      </div>
    </div>
  );
}
