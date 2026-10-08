import type { ErrorResponse } from "./types";

/**
 * A failed request, carrying the backend's error envelope. Callers branch on
 * `code` (stable), never on `message` (for humans, may be reworded).
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: Record<string, unknown>;

  constructor(
    code: string,
    status: number,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /** Status 0 means the request never got an HTTP answer. */
  get isNetwork(): boolean {
    return this.status === 0;
  }

  /** Only failures that a second attempt could plausibly fix: network, 5xx and AI rate limit. */
  get isRetryable(): boolean {
    return this.isNetwork || this.status >= 500 || this.status === 429;
  }
}

export const NETWORK_ERROR = "NETWORK_ERROR";
export const UNKNOWN_ERROR = "UNKNOWN_ERROR";

function isEnvelope(value: unknown): value is ErrorResponse {
  if (typeof value !== "object" || value === null || !("error" in value)) return false;
  const inner = (value as { error: unknown }).error;
  return typeof inner === "object" && inner !== null && "code" in inner && "message" in inner;
}

/** Turns whatever came back on a non-2xx (envelope, proxy HTML, nothing) into an ApiError. */
export function toApiError(error: unknown, response: Response): ApiError {
  if (isEnvelope(error)) {
    const { code, message, details } = error.error;
    return new ApiError(code, response.status, message, details ?? {});
  }
  return new ApiError(UNKNOWN_ERROR, response.status, response.statusText || "Request failed");
}

type FetchResult<T> = { data?: T; error?: unknown; response: Response };

/**
 * The one place an HTTP outcome becomes either data or a thrown ApiError, so
 * hooks and components never inspect responses.
 */
export async function unwrap<T>(request: Promise<FetchResult<T>>): Promise<T> {
  let result: FetchResult<T>;
  try {
    result = await request;
  } catch (cause) {
    // Aborts are TanStack Query cancelling a stale request; let them through untouched.
    // Checked by name: DOMException is not always the class thrown (undici, polyfills).
    if ((cause as { name?: unknown } | null)?.name === "AbortError") throw cause;
    throw new ApiError(
      NETWORK_ERROR,
      0,
      "Can't reach the server. Check your connection and try again.",
    );
  }
  if (result.error !== undefined || !result.response.ok) {
    throw toApiError(result.error, result.response);
  }
  // A 204 has no body; callers of those endpoints type T as undefined/void.
  return result.data as T;
}
