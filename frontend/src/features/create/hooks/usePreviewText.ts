"use client";

import { useMutation } from "@tanstack/react-query";

import { previewTranscriptText } from "../api";
import { PREVIEW_MUTATION_KEY } from "../lib/keys";

/** Parse pasted text. Errors are shown inline under the textarea, so the global toast is muted. */
export function usePreviewText() {
  return useMutation({
    mutationKey: PREVIEW_MUTATION_KEY,
    mutationFn: (text: string) => previewTranscriptText(text),
    meta: { errorToast: false },
  });
}
