"use client";

import { ConfirmDialog } from "@/components/ui";

import { useDeleteMeeting } from "../hooks/useDeleteMeeting";

export type DeleteMeetingDialogProps = {
  meetingId: number;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeleteMeetingDialog({
  meetingId,
  title,
  open,
  onOpenChange,
}: DeleteMeetingDialogProps) {
  const remove = useDeleteMeeting(meetingId);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      danger
      title="Delete this meeting?"
      description={
        <>
          <span className="font-medium text-primary">{title}</span> will be deleted. You can undo
          this right after.
        </>
      }
      confirmLabel="Delete"
      loading={remove.isPending}
      onConfirm={() => remove.mutate(undefined, { onSuccess: () => onOpenChange(false) })}
    />
  );
}
