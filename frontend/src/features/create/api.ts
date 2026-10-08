import { unwrap, type MeetingCreate, type MeetingDetail, type TranscriptPreview } from "@/lib/api";
import { api } from "@/lib/api/client";

/** Parses pasted text; nothing is stored. */
export function previewTranscriptText(text: string, filename?: string): Promise<TranscriptPreview> {
  return unwrap(api.POST("/api/v1/transcript-previews", { body: { text, filename } }));
}

/** Parses an uploaded file; nothing is stored. The file's extension picks the parser. */
export function previewTranscriptFile(file: File): Promise<TranscriptPreview> {
  const form = new FormData();
  form.append("file", file, file.name);
  return unwrap(
    api.POST("/api/v1/transcript-previews/files", {
      // OpenAPI types a binary part as string; the real body is the FormData built above.
      body: { file: file.name },
      bodySerializer: () => form,
    }),
  );
}

/** With segments, the backend also writes the summary and action items before answering. */
export function createMeeting(body: MeetingCreate): Promise<MeetingDetail> {
  return unwrap(api.POST("/api/v1/meetings", { body }));
}
