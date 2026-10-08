import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getToasts, resetToasts, runAction } from "@/components/ui/toast-store";
import { qk, type MeetingListItem, type Page } from "@/lib/api";

import * as api from "../api";
import { meetingFixture, pageOf } from "../testing/fixtures";

import { useDeleteMeeting } from "./useDeleteMeeting";

vi.mock("../api", () => ({
  deleteMeeting: vi.fn(),
  restoreMeeting: vi.fn(),
}));

const LIST_KEY = qk.meetings.list({ page: 1 });

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(LIST_KEY, pageOf([meetingFixture({ id: 1 }), meetingFixture({ id: 2 })]));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useDeleteMeeting(), { wrapper });
  const ids = () => client.getQueryData<Page<MeetingListItem>>(LIST_KEY)?.items.map((m) => m.id);
  return { client, hook, ids };
}

beforeEach(() => resetToasts());
afterEach(() => resetToasts());

describe("useDeleteMeeting", () => {
  it("removes the row at once, then Undo restores it", async () => {
    vi.mocked(api.deleteMeeting).mockResolvedValue(undefined);
    vi.mocked(api.restoreMeeting).mockResolvedValue({} as never);
    const { client, hook, ids } = setup();

    act(() => hook.result.current.mutate(1));
    await waitFor(() => expect(ids()).toEqual([2]));
    expect(client.getQueryData<Page<MeetingListItem>>(LIST_KEY)).toMatchObject({
      total: 1,
      total_pages: 1,
      has_next: false,
    });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(api.deleteMeeting).toHaveBeenCalledWith(1);

    const undo = getToasts().find((t) => t.action?.label === "Undo");
    expect(undo?.message).toBe("Meeting deleted");
    act(() => runAction(undo!));

    await waitFor(() => expect(api.restoreMeeting).toHaveBeenCalledWith(1));
    await waitFor(() =>
      expect(getToasts().some((t) => t.message === "Meeting restored")).toBe(true),
    );
  });

  it("marks the task list stale on delete and on undo", async () => {
    vi.mocked(api.deleteMeeting).mockResolvedValue(undefined);
    vi.mocked(api.restoreMeeting).mockResolvedValue({} as never);
    const { client, hook } = setup();
    client.setQueryData(qk.tasks.list({ scope: "all" }), []);
    const stale = () => client.getQueryState(qk.tasks.list({ scope: "all" }))?.isInvalidated;

    act(() => hook.result.current.mutate(1));
    await waitFor(() => expect(stale()).toBe(true));

    client.setQueryData(qk.tasks.list({ scope: "all" }), []);
    expect(stale()).toBe(false);
    act(() => runAction(getToasts().find((t) => t.action?.label === "Undo")!));
    await waitFor(() => expect(stale()).toBe(true));
  });

  it("puts the row back when the delete fails", async () => {
    vi.mocked(api.deleteMeeting).mockRejectedValue(new Error("boom"));
    const { hook, ids } = setup();

    act(() => hook.result.current.mutate(1));
    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(ids()).toEqual([1, 2]);
    expect(getToasts().some((t) => t.action?.label === "Undo")).toBe(false);
  });
});
