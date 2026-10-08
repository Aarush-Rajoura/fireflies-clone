/** Mirrors the backend's max_upload_mb so oversize files fail before any upload. */
export const MAX_UPLOAD_MB = 10;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = [".txt", ".vtt", ".srt", ".json"] as const;
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(",");

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot).toLowerCase();
}

/** Returns a user-facing reason the file can't be used, or null when it can. */
export function validateTranscriptFile(file: Pick<File, "name" | "size">): string | null {
  if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(extensionOf(file.name))) {
    return `“${file.name}” isn't a supported transcript. Use a .txt, .vtt, .srt or .json file.`;
  }
  if (file.size === 0) return `“${file.name}” is empty.`;
  if (file.size > MAX_UPLOAD_BYTES) return `“${file.name}” is larger than ${MAX_UPLOAD_MB} MB.`;
  return null;
}

/** "weekly_sync-notes.vtt" → "weekly sync notes": a sensible default meeting title. */
export function titleFromFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  return (dot > 0 ? name.slice(0, dot) : name).replace(/[_-]+/g, " ").trim();
}
