import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError, NETWORK_ERROR, type AskResponse } from "@/lib/api";

import { ask } from "../api";
import { describeAskError } from "../lib/errors";
import { useAsk } from "./useAsk";

vi.mock("../api", () => ({ ask: vi.fn() }));

const answer: AskResponse = {
  answer: "The launch is on March 30.",
  citations: [
    {
      segment_id: 41,
      start_ms: 754_000,
      quote: "We launch March 30",
      meeting_id: 7,
      meeting_title: "Launch",
    },
  ],
  provider: "fake",
  model: "fake-1",
};

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useAsk", () => {
  it("adds the question, shows pending, then the answer with its citations", async () => {
    const d = deferred<AskResponse>();
    vi.mocked(ask).mockReturnValue(d.promise);
    const { result } = renderHook(() => useAsk({ meetingId: 7 }));

    act(() => void result.current.send("  When is the launch?  "));
    expect(ask).toHaveBeenCalledWith({ meetingId: 7 }, "When is the launch?");
    expect(result.current.pending).toBe(true);
    expect(result.current.messages.map((m) => [m.role, m.text])).toEqual([
      ["user", "When is the launch?"],
    ]);

    await act(async () => d.resolve(answer));
    expect(result.current.pending).toBe(false);
    const last = result.current.messages.at(-1)!;
    expect(last.role).toBe("assistant");
    expect(last.text).toBe("The launch is on March 30.");
    expect(last.citations).toEqual(answer.citations);
  });

  it("ignores blank questions and a second question while one is pending", () => {
    vi.mocked(ask).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAsk({ meetingIds: [1, 2] }));

    let accepted = true;
    act(() => void (accepted = result.current.send("   ")));
    expect(accepted).toBe(false);
    act(() => void result.current.send("First?"));
    act(() => void (accepted = result.current.send("Second?")));
    expect(accepted).toBe(false);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(ask).toHaveBeenCalledWith({ meetingIds: [1, 2] }, "First?");
  });

  it("maps a 429 to a friendly, retryable error and retries without repeating the question", async () => {
    vi.mocked(ask).mockRejectedValueOnce(
      new ApiError("RATE_LIMITED", 429, "AI rate limit exceeded"),
    );
    const { result } = renderHook(() => useAsk({ meetingId: 7 }));

    await act(async () => void result.current.send("When is the launch?"));
    expect(result.current.error).toMatchObject({
      message: expect.stringContaining("Try again in a minute"),
      retryable: true,
      question: "When is the launch?",
    });

    vi.mocked(ask).mockResolvedValueOnce(answer);
    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
  });

  it("drops an answer that arrives after the conversation was reset", async () => {
    const d = deferred<AskResponse>();
    vi.mocked(ask).mockReturnValue(d.promise);
    const { result } = renderHook(() => useAsk({ meetingId: 7 }));

    act(() => void result.current.send("When?"));
    act(() => result.current.reset());
    await act(async () => d.resolve(answer));
    expect(result.current.messages).toEqual([]);
    expect(result.current.pending).toBe(false);
  });
});

describe("describeAskError", () => {
  it("maps 503 AI_UNAVAILABLE to an unavailable message", () => {
    const failure = describeAskError(new ApiError("AI_UNAVAILABLE", 503, "provider down"));
    expect(failure.message).toMatch(/unavailable/i);
    expect(failure.retryable).toBe(true);
  });

  it("keeps the network message, and passes validation messages through without retry", () => {
    expect(
      describeAskError(new ApiError(NETWORK_ERROR, 0, "Can't reach the server.")).message,
    ).toBe("Can't reach the server.");
    expect(describeAskError(new ApiError("VALIDATION_ERROR", 422, "Question is too long"))).toEqual(
      {
        message: "Question is too long",
        retryable: false,
      },
    );
  });

  it("explains a deleted or missing meeting and does not offer retry", () => {
    expect(describeAskError(new ApiError("GONE", 410, "gone")).retryable).toBe(false);
    expect(describeAskError(new ApiError("NOT_FOUND", 404, "nope")).message).toMatch(/no longer/);
  });
});
