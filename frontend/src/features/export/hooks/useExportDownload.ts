"use client";

import { useMutation } from "@tanstack/react-query";

import { toast } from "@/components/ui";
import { ApiError, NETWORK_ERROR } from "@/lib/api";
import { downloadBlob } from "@/lib/utils/download";

import { fetchExport, type ExportRequest } from "../api";

/** What the toast says when an export can't be produced. */
export function describeExportError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === NETWORK_ERROR) return error.message;
    if (error.status === 404) return "This meeting no longer exists.";
    if (error.status === 410) return "This meeting was deleted. Restore it to export it.";
    if (error.status === 422 && error.message) return error.message;
  }
  return "Couldn't export the meeting. Please try again.";
}

/**
 * Exports one meeting: the file is fetched first and saved only once it
 * arrived, so a failure is a toast rather than a saved error page.
 */
export function useExportDownload(meetingId: number) {
  return useMutation({
    mutationFn: (request: ExportRequest) => fetchExport(meetingId, request),
    meta: { errorToast: false },
    onSuccess: ({ blob, filename }) => {
      downloadBlob(blob, filename);
      toast.success("Downloading…");
    },
    onError: (error) => toast.error(describeExportError(error)),
  });
}
