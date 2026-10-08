"use client";

import { Calendar, Mic, Upload, Video } from "lucide-react";
import { useState } from "react";

import { SplitButton } from "@/components/ui";
import { openCreateMeeting } from "@/features/create";

import { CaptureModal } from "./CaptureModal";
import { useComingSoon } from "./ComingSoonDialog";

/** Top-bar "Capture ▾": live capture, scheduling and recording are placeholders; upload is real. */
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
            onSelect: () => openCreateMeeting("upload"),
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
      <CaptureModal open={liveOpen} onOpenChange={setLiveOpen} />
      {soon.dialog}
    </>
  );
}
