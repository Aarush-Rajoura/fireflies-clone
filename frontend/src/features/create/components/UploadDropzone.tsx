"use client";

import { FileUp } from "lucide-react";
import { useState } from "react";

import { Dropzone, Spinner } from "@/components/ui";
import type { TranscriptPreview } from "@/lib/api";

import { usePreviewFile } from "../hooks/usePreviewFile";
import { createErrorMessage } from "../lib/error-messages";
import { ACCEPT_ATTRIBUTE, MAX_UPLOAD_MB, validateTranscriptFile } from "../lib/file-validation";

import { InlineError } from "./InlineError";

export type UploadDropzoneProps = {
  onPreview: (preview: TranscriptPreview, file: File) => void;
};

/** Pick or drop one transcript file; it is checked here first, then parsed by the server. */
export function UploadDropzone({ onPreview }: UploadDropzoneProps) {
  const preview = usePreviewFile();
  const [clientError, setClientError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const pick = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    preview.reset();
    setFileName(file.name);
    const problem =
      files.length > 1 ? "Drop one transcript at a time." : validateTranscriptFile(file);
    setClientError(problem);
    if (problem) return;
    preview.mutate(file, { onSuccess: (result) => onPreview(result, file) });
  };

  const error = clientError ?? (preview.isError ? createErrorMessage(preview.error) : null);

  return (
    <div className="flex flex-col gap-3">
      <Dropzone
        accept={ACCEPT_ATTRIBUTE}
        label="Choose a transcript file"
        onFiles={pick}
        disabled={preview.isPending}
      >
        {preview.isPending ? (
          <>
            <Spinner className="size-6 text-accent" label="Reading transcript" />
            <p className="text-body text-secondary">Reading {fileName}…</p>
          </>
        ) : (
          <>
            <span className="flex size-10 items-center justify-center rounded-full bg-accent-subtle text-accent">
              <FileUp className="size-5" strokeWidth={1.75} />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-body-strong text-primary">
                Drag a transcript here, or <span className="text-accent">browse</span>
              </p>
              <p className="text-meta text-muted">
                .txt, .vtt, .srt or .json · up to {MAX_UPLOAD_MB} MB
              </p>
            </div>
          </>
        )}
      </Dropzone>
      {error && <InlineError message={error} />}
    </div>
  );
}
