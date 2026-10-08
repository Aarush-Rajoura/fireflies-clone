import { ApiError } from "@/lib/api";

/** The server's limit, after trimming. */
export const MAX_COMMENT_LENGTH = 2000;

/** Why `body` can't be posted, or null when it can. Mirrors the server's rule so nobody waits for a 422. */
export function commentBodyError(body: string): string | null {
  const length = body.trim().length;
  if (length === 0) return "Write a comment first.";
  if (length > MAX_COMMENT_LENGTH) {
    const over = (length - MAX_COMMENT_LENGTH).toLocaleString("en-US");
    return `Comments can be up to ${MAX_COMMENT_LENGTH.toLocaleString("en-US")} characters (${over} over).`;
  }
  return null;
}

export function commentFailureMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.code === "SEGMENT_NOT_IN_MEETING") return "That line isn't part of this meeting.";
    if (error.code === "COMMENT_NOT_FOUND") return "That comment was already deleted.";
    if (error.message) return error.message;
  }
  return fallback;
}
