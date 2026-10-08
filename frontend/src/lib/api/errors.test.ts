import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "./client";
import { ApiError, NETWORK_ERROR, unwrap } from "./errors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("unwrap", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns data on 2xx", async () => {
    const response = json({ id: 1 });
    await expect(unwrap(Promise.resolve({ data: { id: 1 }, response }))).resolves.toEqual({
      id: 1,
    });
  });

  it("throws ApiError carrying the envelope's code, status, message and details", async () => {
    const error = {
      error: { code: "MEETING_DELETED", message: "Meeting was deleted", details: { id: 3 } },
    };
    const response = json(error, 410);
    const thrown = await unwrap(Promise.resolve({ error, response })).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(ApiError);
    expect(thrown).toMatchObject({
      code: "MEETING_DELETED",
      status: 410,
      message: "Meeting was deleted",
      details: { id: 3 },
    });
    expect((thrown as ApiError).isRetryable).toBe(false);
  });

  it("maps a rejected fetch to a retryable network ApiError", async () => {
    const thrown = await unwrap(Promise.reject(new TypeError("Failed to fetch"))).catch(
      (e: unknown) => e,
    );
    expect(thrown).toMatchObject({ code: NETWORK_ERROR, status: 0 });
    expect((thrown as ApiError).isRetryable).toBe(true);
  });

  it("lets aborts through untouched so cancelled queries stay silent", async () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    await expect(unwrap(Promise.reject(abort))).rejects.toBe(abort);
  });

  it("still throws on a non-envelope error body, e.g. a proxy 502", async () => {
    const response = new Response("<html>Bad gateway</html>", {
      status: 502,
      statusText: "Bad Gateway",
    });
    const thrown = await unwrap(Promise.resolve({ error: "<html>", response })).catch(
      (e: unknown) => e,
    );
    expect(thrown).toMatchObject({ status: 502, message: "Bad Gateway" });
    expect((thrown as ApiError).isRetryable).toBe(true);
  });

  it("works end to end with the typed client on the same origin", async () => {
    const fetchMock = vi.fn<(req: Request) => Promise<Response>>(async () =>
      json({ id: 1, name: "Ada", email: "ada@example.com" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const me = await unwrap(api.GET("/api/v1/me"));
    expect(me.name).toBe("Ada");
    expect(new URL(fetchMock.mock.calls[0]![0].url).pathname).toBe("/api/v1/me");
  });
});
