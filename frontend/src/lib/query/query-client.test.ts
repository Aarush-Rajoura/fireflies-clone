import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import { makeQueryClient, shouldRetry } from "./query-client";

describe("query client policy", () => {
  afterEach(() => vi.restoreAllMocks());

  it("retries once, only for network and server errors", () => {
    expect(shouldRetry(0, new ApiError("X", 503, "down"))).toBe(true);
    expect(shouldRetry(0, new ApiError("NETWORK_ERROR", 0, "offline"))).toBe(true);
    expect(shouldRetry(1, new ApiError("X", 503, "down"))).toBe(false);
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

  it("stays quiet for mutations that handle their own errors", async () => {
    const notify = vi.fn();
    const client = makeQueryClient(notify);
    await client
      .getMutationCache()
      .build(client, {
        mutationFn: () => Promise.reject(new ApiError("X", 500, "x")),
        meta: { silent: true },
      })
      .execute(undefined)
      .catch(() => undefined);
    expect(notify).not.toHaveBeenCalled();
  });
});
