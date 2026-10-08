"use client";

import { Calendar, Mic, Upload, Video } from "lucide-react";
import { useState } from "react";

import { SplitButton } from "@/components/ui";
import { openCreateMeeting } from "@/features/create";
import { CaptureModal, ScheduleModal } from "@/features/home";

import { useComingSoon } from "./ComingSoonDialog";

/** Top-bar "Capture ▾": live capture and scheduling open the Home flows; upload opens the create flow. */
export function CaptureMenu() {
  const [liveOpen, setLiveOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
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
            onSelect: () => setScheduleOpen(true),
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
      <ScheduleModal open={scheduleOpen} onOpenChange={setScheduleOpen} />
      {soon.dialog}
    </>
  );
}
