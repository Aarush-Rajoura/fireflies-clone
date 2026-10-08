"use client";

import { Calendar, Mic, Upload, Video } from "lucide-react";
import { useState } from "react";

import { Button, Input, Modal, SoonBadge, SplitButton } from "@/components/ui";

import { useComingSoon } from "./ComingSoonDialog";

/** "Add Fred to a live meeting": the live bot is out of scope, so the form is shown but disabled. */
function LiveMeetingDialog({
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
      title="Add Fred to a live meeting"
      description="Fred joins your Zoom, Google Meet or Teams call and takes notes for you."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" disabled>
            Add to meeting
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor="live-meeting-link" className="text-body-strong text-primary">
            Meeting link
          </label>
          <SoonBadge />
        </div>
        <Input id="live-meeting-link" disabled placeholder="https://zoom.us/j/…" />
        <p className="text-meta text-muted">
          Live capture is coming soon. Upload a transcript to try Fred today.
        </p>
      </div>
    </Modal>
  );
}

/** Top-bar "Capture ▾". The create-meeting flow replaces the Coming Soon entries when it ships. */
export function CaptureMenu() {
  const [liveOpen, setLiveOpen] = useState(false);
  const soon = useComingSoon();
  return (
    <>
      <SplitButton
        label="Capture"
        icon={<Video strokeWidth={1.75} />}
        onClick={() => setLiveOpen(true)}
        menuLabel="More capture options"
        items={[
          {
            label: "Add to live meeting",
            icon: <Video strokeWidth={1.75} />,
            onSelect: () => setLiveOpen(true),
          },
          {
            label: "Schedule new meeting",
            icon: <Calendar strokeWidth={1.75} />,
            onSelect: () =>
              soon.show({
                title: "Schedule new meeting",
                message: "Scheduling Fred for upcoming calendar meetings is coming soon.",
              }),
          },
          {
            label: "Upload audio or video",
            icon: <Upload strokeWidth={1.75} />,
            onSelect: () =>
              soon.show({
                title: "Upload audio or video",
                message:
                  "Speech-to-text is coming soon. Upload a transcript instead to get a summary and action items.",
              }),
          },
          {
            label: "Start recording",
            icon: <Mic strokeWidth={1.75} />,
            onSelect: () =>
              soon.show({
                title: "Start recording",
                message: "Recording from your microphone is coming soon.",
              }),
          },
        ]}
      />
      <LiveMeetingDialog open={liveOpen} onOpenChange={setLiveOpen} />
      {soon.dialog}
    </>
  );
}
