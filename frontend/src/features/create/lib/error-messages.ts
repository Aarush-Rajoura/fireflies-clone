import { ApiError, NETWORK_ERROR } from "@/lib/api";

import { MAX_UPLOAD_MB } from "./file-validation";

const RATE_LIMITED = "Fred is handling a lot of meetings right now. Wait a minute and try again.";

const BY_CODE: Record<string, string> = {
  TRANSCRIPT_EMPTY: "That transcript has no lines to read. Add some dialogue and try again.",
  TRANSCRIPT_UNRECOGNISED:
    "We couldn't read that transcript. Use VTT, SRT, JSON, or lines like “Name: what they said”.",
  UPLOAD_TOO_LARGE: `That transcript is larger than ${MAX_UPLOAD_MB} MB.`,
  UPLOAD_NOT_UTF8: "That file isn't UTF-8 text. Re-save it as UTF-8 and try again.",
  RATE_LIMITED,
  AI_UNAVAILABLE: "Fred couldn't write your notes just now. Please try again in a moment.",
  NOT_SEEDED: "The workspace isn't set up yet. Seed the database and try again.",
};

const GENERIC = "Something went wrong. Please try again.";

/** Branches on the stable error code, never on the server's wording. */
export function createErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return GENERIC;
  const known = BY_CODE[error.code];
  if (known) return known;
  if (error.status === 429) return RATE_LIMITED;
  if (error.code === NETWORK_ERROR) return error.message;
  return error.message || GENERIC;
}
