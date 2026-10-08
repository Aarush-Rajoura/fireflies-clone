"use client";

import { useMutation } from "@tanstack/react-query";

import { previewTranscriptText } from "../api";

/** Parse pasted text. Errors are shown inline under the textarea, so the global toast is muted. */
export function usePreviewText() {
  return useMutation({
    mutationFn: (text: string) => previewTranscriptText(text),
    meta: { errorToast: false },
  });
}
