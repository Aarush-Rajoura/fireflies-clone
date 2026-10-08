import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { fetchMeetings } from "../api";
import { parseMeetingsParams } from "../lib/params";
import { meetingFixture, pageOf } from "../testing/fixtures";
import { useScopedMeetingIds } from "./useScopedMeetingIds";

vi.mock("../api", () => ({ fetchMeetings: vi.fn() }));

function render(search: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useScopedMeetingIds(parseMeetingsParams(new URLSearchParams(search))), {
    wrapper,
  });
}

describe("useScopedMeetingIds", () => {
  it("sends no ids for plain All Meetings, without fetching", () => {
    const { result } = render("sort=title&page=3");
    expect(result.current).toEqual({ status: "all", meetingIds: undefined });
    expect(fetchMeetings).not.toHaveBeenCalled();
  });

  it("is loading (never an empty or stale scope) until every matching id is in", async () => {
    let resolve!: (v: ReturnType<typeof pageOf>) => void;
    vi.mocked(fetchMeetings).mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = render("channel=3&tag=2&q=launch&page=4&sort=title");

    expect(result.current).toEqual({ status: "loading", meetingIds: undefined });
    const [query] = vi.mocked(fetchMeetings).mock.calls[0]!;
    // Every match, not the page on screen: first page of 100, filters kept.
    expect(query).toMatchObject({ channel: 3, tag: [2], q: "launch", page: 1, page_size: 100 });

    resolve(pageOf([meetingFixture({ id: 4 }), meetingFixture({ id: 9 })]));
    await waitFor(() => expect(result.current).toEqual({ status: "ready", meetingIds: [4, 9] }));
  });

  it("reports an error rather than falling back to some other scope", async () => {
    vi.mocked(fetchMeetings).mockRejectedValue(new Error("down"));
    const { result } = render("scope=hosted");
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.meetingIds).toBeUndefined();
  });
});
