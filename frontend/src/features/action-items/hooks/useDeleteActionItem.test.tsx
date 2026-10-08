import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resetToasts } from "@/components/ui/toast-store";
import { ApiError, qk, type ActionItem } from "@/lib/api";

import { deleteActionItem } from "../api";
import { useDeleteActionItem } from "./useDeleteActionItem";

vi.mock("../api", () => ({
  deleteActionItem: vi.fn(),
  fetchActionItems: vi.fn(() => new Promise(() => {})),
}));

const item = (id: number): ActionItem => ({
  id,
  meeting_id: 1,
  text: `Item ${id}`,
  status: "open",
  source: "manual",
  start_ms: null,
  due_date: null,
  completed_at: null,
  assignee: null,
});

describe("useDeleteActionItem", () => {
  afterEach(() => resetToasts());

  it("removes optimistically and restores only the failed row at its place", async () => {
    const client = new QueryClient();
    client.setQueryData(qk.actionItems(1), [item(1), item(2), item(3)]);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useDeleteActionItem(1), { wrapper });
    const ids = () => client.getQueryData<ActionItem[]>(qk.actionItems(1))?.map((x) => x.id);

    const rejects: ((e: unknown) => void)[] = [];
    vi.mocked(deleteActionItem).mockImplementation(() => new Promise((_, r) => rejects.push(r)));
    act(() => result.current.mutate(2));
    act(() => result.current.mutate(3));
    await waitFor(() => expect(ids()).toEqual([1]));

    await act(async () => rejects[0]!(new ApiError("X", 500, "down")));
    await waitFor(() => expect(ids()).toEqual([1, 2]));
  });
});
