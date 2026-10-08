import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api";

import { regenerateErrorFeedback } from "./useRegenerateSummary";

describe("regenerateErrorFeedback", () => {
  it("treats an in-flight generation as info, not failure", () => {
    expect(regenerateErrorFeedback(new ApiError("SUMMARY_GENERATING", 409, "busy"))).toEqual({
      kind: "info",
      message: "Already generating",
    });
  });

  it("explains that the old summary stays when AI is down", () => {
    expect(regenerateErrorFeedback(new ApiError("AI_UNAVAILABLE", 503, "x"))).toEqual({
      kind: "error",
      message: "AI unavailable — showing the last summary",
    });
  });

  it("falls back to the server message or a generic one", () => {
    expect(
      regenerateErrorFeedback(new ApiError("NO_TRANSCRIPT", 422, "No transcript")).message,
    ).toBe("No transcript");
    expect(regenerateErrorFeedback(new Error("boom")).message).toBe(
      "Couldn't regenerate the summary.",
    );
  });
});
