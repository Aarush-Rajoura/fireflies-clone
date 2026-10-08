import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getToasts, resetToasts } from "@/components/ui/toast-store";
import { ApiError, qk, type ActionItem } from "@/lib/api";

import { deleteTask, updateTask } from "../api";

import { useDeleteTask } from "./useDeleteTask";
import { useUpdateTask } from "./useUpdateTask";

vi.mock("../api", () => ({
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  fetchTasks: vi.fn(() => new Promise(() => {})),
}));

const base: ActionItem = {
  id: 5,
  meeting_id: 1,
  meeting: { id: 1, title: "Weekly sync" },
  assignee_user: null,
  text: "Send the list",
  status: "open",
  source: "ai",
  start_ms: null,
  due_date: null,
  completed_at: null,
  assignee: null,
};

const MINE = qk.tasks.list({ scope: "mine", tz: "UTC" });
const ALL = qk.tasks.list({ scope: "all", tz: "UTC" });

function setup<T>(hook: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(MINE, [base]);
  client.setQueryData(ALL, [{ ...base, id: 4, text: "Other" }, base]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(hook, { wrapper });
  const cached = (key: readonly unknown[]) => client.getQueryData<ActionItem[]>(key);
  return { result, cached };
}

describe("task mutations", () => {
  afterEach(() => resetToasts());

  it("completes in every cached list at once, and rolls back on failure", async () => {
    let reject!: (e: unknown) => void;
    vi.mocked(updateTask).mockReturnValue(new Promise((_, r) => (reject = r)));
    const { result, cached } = setup(useUpdateTask);

    act(() => result.current.mutate({ item: base, patch: { status: "completed" } }));
    await waitFor(() => expect(cached(MINE)?.[0]?.status).toBe("completed"));
    expect(cached(ALL)?.[1]?.status).toBe("completed");

    await act(async () => reject(new ApiError("MEETING_DELETED", 410, "Meeting has been deleted")));
    await waitFor(() => expect(cached(MINE)?.[0]?.status).toBe("open"));
    expect(cached(ALL)?.[1]?.status).toBe("open");
    expect(getToasts().map((t) => t.message)).toEqual(["Meeting has been deleted"]);
  });

  it("removes a deleted task everywhere and restores it in place on failure", async () => {
    let reject!: (e: unknown) => void;
    vi.mocked(deleteTask).mockReturnValue(new Promise((_, r) => (reject = r)));
    const { result, cached } = setup(useDeleteTask);

    act(() => result.current.mutate(base));
    await waitFor(() => expect(cached(MINE)).toEqual([]));
    expect(cached(ALL)?.map((x) => x.id)).toEqual([4]);

    await act(async () => reject(new ApiError("NETWORK_ERROR", 0, "")));
    await waitFor(() => expect(cached(ALL)?.map((x) => x.id)).toEqual([4, 5]));
    expect(cached(MINE)?.map((x) => x.id)).toEqual([5]);
  });
});
