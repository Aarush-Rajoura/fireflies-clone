import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import { makeQueryClient, shouldRetry, type MutationErrorMeta } from "./query-client";

describe("query client policy", () => {
  afterEach(() => vi.restoreAllMocks());

  it("retries once, only for network and server errors", () => {
    expect(shouldRetry(0, new ApiError("X", 503, "down"))).toBe(true);
    expect(shouldRetry(0, new ApiError("NETWORK_ERROR", 0, "offline"))).toBe(true);
    expect(shouldRetry(1, new ApiError("X", 503, "down"))).toBe(false);
    expect(shouldRetry(0, new ApiError("AI_RATE_LIMITED", 429, "slow down"))).toBe(true);
    expect(shouldRetry(0, new ApiError("NOT_FOUND", 404, "nope"))).toBe(false);
    expect(shouldRetry(0, new Error("bug"))).toBe(false);
  });

  it("toasts a failed mutation, offering Retry only when retrying can help", async () => {
    const notify = vi.fn();
    const client = makeQueryClient(notify);
    const run = (error: Error) =>
      client
        .getMutationCache()
        .build(client, { mutationFn: () => Promise.reject(error) })
        .execute(undefined)
        .catch(() => undefined);

    await run(new ApiError("X", 500, "Server broke"));
    expect(notify).toHaveBeenLastCalledWith("Server broke", expect.any(Function));

    await run(new ApiError("VALIDATION_ERROR", 422, "Bad title"));
    expect(notify).toHaveBeenLastCalledWith("Bad title", undefined);
  });

  const fail = (
    client: ReturnType<typeof makeQueryClient>,
    error: Error,
    meta: MutationErrorMeta,
  ) =>
    client
      .getMutationCache()
      .build(client, { mutationFn: () => Promise.reject(error), meta })
      .execute(undefined)
      .catch(() => undefined);

  it("stays quiet for mutations that show their own error toast", async () => {
    const notify = vi.fn();
    const client = makeQueryClient(notify);
    await fail(client, new ApiError("X", 500, "x"), { errorToast: false });
    expect(notify).not.toHaveBeenCalled();
  });

  it("lets a mutation force Retry on or off", async () => {
    const notify = vi.fn();
    const client = makeQueryClient(notify);
    await fail(client, new ApiError("X", 500, "x"), { retryable: false });
    expect(notify).toHaveBeenLastCalledWith("x", undefined);
    await fail(client, new ApiError("CONFLICT", 409, "y"), { retryable: true });
    expect(notify).toHaveBeenLastCalledWith("y", expect.any(Function));
  });
});
