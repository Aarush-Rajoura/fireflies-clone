"use client";

import { AlertCircle, FileQuestion, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button, EmptyState, Skeleton } from "@/components/ui";

import { useRestoreMeeting } from "../hooks/useRestoreMeeting";

function BackButton() {
  const router = useRouter();
  return (
    <Button variant="secondary" onClick={() => router.push("/meetings")}>
      Back to meetings
    </Button>
  );
}

/** 410: the meeting is in the trash; restoring brings the whole page back in place. */
export function DeletedMeetingState({ meetingId }: { meetingId: number }) {
  const restore = useRestoreMeeting(meetingId);
  return (
    <EmptyState
      className="py-24"
      icon={<Trash2 strokeWidth={1.75} />}
      title="This meeting was deleted"
      description="Restore it to bring back its transcript, summary and action items."
      action={
        <div className="flex gap-2">
          <BackButton />
          <Button variant="primary" loading={restore.isPending} onClick={() => restore.mutate()}>
            Restore
          </Button>
        </div>
      }
    />
  );
}

export function MeetingNotFound() {
  return (
    <EmptyState
      className="py-24"
      icon={<FileQuestion strokeWidth={1.75} />}
      title="Meeting not found"
      description="It may have been removed, or the link is wrong."
      action={<BackButton />}
    />
  );
}

export function MeetingLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyState
      className="py-24"
      icon={<AlertCircle strokeWidth={1.75} />}
      title="Couldn't load this meeting"
      description={message}
      action={
        <div className="flex gap-2">
          <BackButton />
          <Button variant="primary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      }
    />
  );
}

/** Mirrors the loaded layout (header, two columns) so nothing jumps when data lands. */
export function NotepadSkeleton() {
  return (
    <div role="status" aria-label="Loading meeting" className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 border-b border-subtle bg-surface-1 px-6 pb-3 pt-2.5">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-7 w-96 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex basis-[55%] flex-col gap-4 px-8 py-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-4 h-5 w-32" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex flex-1 flex-col gap-4 border-l border-subtle px-4 py-4">
          <Skeleton className="h-20 w-full rounded-card" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
