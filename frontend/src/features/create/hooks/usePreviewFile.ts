"use client";

import { useMutation } from "@tanstack/react-query";

import { previewTranscriptFile } from "../api";

/** Parse an uploaded file. Errors are shown inline in the dropzone, so the global toast is muted. */
export function usePreviewFile() {
  return useMutation({
    mutationFn: (file: File) => previewTranscriptFile(file),
    meta: { errorToast: false },
  });
}
