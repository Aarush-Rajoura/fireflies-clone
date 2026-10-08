"use client";

import { Button, Modal, SoonBadge } from "@/components/ui";

/** The Upload File card's target until the upload flow is wired in, so the card is never a dead end. */
export function UploadSoonModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Upload a recording"
      size="sm"
      footer={
        <Button variant="primary" onClick={() => onOpenChange(false)}>
          Got it
        </Button>
      }
    >
      <div className="flex flex-col items-start gap-3">
        <SoonBadge />
        <p className="text-body text-secondary">
          Uploading audio, video and transcripts is coming soon. Fred will then summarise them and
          pull out action items for you.
        </p>
      </div>
    </Modal>
  );
}
