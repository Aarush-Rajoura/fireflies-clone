"use client";

import { useMutation } from "@tanstack/react-query";

import { previewTranscriptFile } from "../api";
import { PREVIEW_MUTATION_KEY } from "../lib/keys";

/** Parse an uploaded file. Errors are shown inline in the dropzone, so the global toast is muted. */
export function usePreviewFile() {
  return useMutation({
    mutationKey: PREVIEW_MUTATION_KEY,
    mutationFn: (file: File) => previewTranscriptFile(file),
    meta: { errorToast: false },
  });
}
