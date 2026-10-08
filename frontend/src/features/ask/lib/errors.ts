import { ApiError, NETWORK_ERROR } from "@/lib/api";

export type AskFailure = { message: string; retryable: boolean };

/**
 * What the chat says when Fred can't answer. Branches on status and code
 * (stable), never on the server's message, except for validation errors,
 * whose message is written for people.
 */
export function describeAskError(error: unknown): AskFailure {
  if (!(error instanceof ApiError)) {
    return { message: "Fred couldn't answer that. Please try again.", retryable: true };
  }
  if (error.status === 429 || error.code === "RATE_LIMITED") {
    return {
      message: "Fred is answering a lot of questions right now. Try again in a minute.",
      retryable: true,
    };
  }
  if (error.status === 503 || error.code === "AI_UNAVAILABLE") {
    return {
      message: "Fred's AI is unavailable right now. Please try again shortly.",
      retryable: true,
    };
  }
  if (error.code === NETWORK_ERROR) return { message: error.message, retryable: true };
  if (error.status === 404) return { message: "This meeting no longer exists.", retryable: false };
  if (error.status === 410) {
    return { message: "This meeting was deleted. Restore it to ask about it.", retryable: false };
  }
  if (error.status === 422 && error.message) return { message: error.message, retryable: false };
  return { message: "Fred couldn't answer that. Please try again.", retryable: error.isRetryable };
}
