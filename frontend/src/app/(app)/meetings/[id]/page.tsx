import { notFound } from "next/navigation";

import { MeetingPreview } from "@/features/meetings";

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meetingId = Number(id);
  if (!Number.isSafeInteger(meetingId) || meetingId <= 0) notFound();
  return <MeetingPreview id={meetingId} />;
}
