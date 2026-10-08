import { describe, expect, it } from "vitest";

import { ApiError, NETWORK_ERROR } from "@/lib/api";

import { createErrorMessage } from "./error-messages";

describe("createErrorMessage", () => {
  it.each([
    ["TRANSCRIPT_EMPTY", 422, /no lines to read/],
    ["TRANSCRIPT_UNRECOGNISED", 422, /couldn't read that transcript/],
    ["UPLOAD_TOO_LARGE", 422, /larger than 10 MB/],
    ["RATE_LIMITED", 429, /Wait a minute/],
    ["AI_UNAVAILABLE", 503, /couldn't write your notes/],
  ])("maps %s to its own message", (code, status, expected) => {
    expect(createErrorMessage(new ApiError(code, status, "server words"))).toMatch(expected);
  });

  it("treats any 429 as rate limiting, whatever the code", () => {
    expect(createErrorMessage(new ApiError("UNKNOWN_ERROR", 429, ""))).toMatch(/Wait a minute/);
  });

  it("falls back to the server message for other codes", () => {
    expect(createErrorMessage(new ApiError("VALIDATION_ERROR", 422, "Title is too long"))).toBe(
      "Title is too long",
    );
    expect(createErrorMessage(new ApiError(NETWORK_ERROR, 0, "Can't reach the server."))).toBe(
      "Can't reach the server.",
    );
  });

  it("never shows raw errors that are not API errors", () => {
    expect(createErrorMessage(new TypeError("x is undefined"))).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
