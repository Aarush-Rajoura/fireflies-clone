import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getToasts, resetToasts } from "@/components/ui/toast-store";
import { ApiError, qk, type ActionItem } from "@/lib/api";

import { updateActionItem } from "../api";
import { applyPatch, useUpdateActionItem } from "./useUpdateActionItem";

vi.mock("../api", () => ({
  updateActionItem: vi.fn(),
  fetchActionItems: vi.fn(() => new Promise(() => {})),
}));

const base: ActionItem = {
  id: 5,
  meeting_id: 1,
  meeting: null,
  assignee_user: null,
  text: "Send the list",
  status: "open",
  source: "ai",
  start_ms: 1_000,
  due_date: null,
  completed_at: null,
  assignee: null,
};

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(qk.actionItems(1), [base, { ...base, id: 6, text: "Other" }]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useUpdateActionItem(1), { wrapper });
  const cached = (id = 5) =>
    client.getQueryData<ActionItem[]>(qk.actionItems(1))?.find((x) => x.id === id);
  return { result, cached };
}

describe("useUpdateActionItem", () => {
  afterEach(() => resetToasts());

  it("toggles optimistically, then rolls back and toasts when the server refuses", async () => {
    let reject!: (e: unknown) => void;
    vi.mocked(updateActionItem).mockReturnValue(new Promise((_, r) => (reject = r)));
    const { result, cached } = setup();

    act(() => result.current.mutate({ id: 5, patch: { status: "completed" } }));
    await waitFor(() => expect(cached()?.status).toBe("completed"));
    expect(cached()?.completed_at).not.toBeNull();

    await act(async () => reject(new ApiError("VALIDATION_ERROR", 422, "Nope")));
    await waitFor(() => expect(cached()?.status).toBe("open"));
    expect(cached()?.completed_at).toBeNull();
    expect(getToasts().map((t) => [t.kind, t.message])).toEqual([["error", "Nope"]]);
  });

  it("rolls back only the failed item's patched fields, not concurrent edits", async () => {
    const rejects: ((e: unknown) => void)[] = [];
    vi.mocked(updateActionItem).mockImplementation(() => new Promise((_, r) => rejects.push(r)));
    const { result, cached } = setup();

    act(() => result.current.mutate({ id: 5, patch: { status: "completed" } }));
    act(() => result.current.mutate({ id: 6, patch: { text: "Other, edited" } }));
    act(() => result.current.mutate({ id: 5, patch: { due_date: "2026-10-12" } }));
    await waitFor(() => expect(rejects).toHaveLength(3));

    await act(async () => rejects[0]!(new ApiError("X", 422, "no")));
    await waitFor(() => expect(cached(5)?.status).toBe("open"));
    expect(cached(5)?.due_date).toBe("2026-10-12");
    expect(cached(6)?.text).toBe("Other, edited");
  });

  it("keeps the server's version on success", async () => {
    vi.mocked(updateActionItem).mockResolvedValue({ ...base, text: "Send the final list" });
    const { result, cached } = setup();
    await act(async () => {
      await result.current.mutateAsync({ id: 5, patch: { text: "Send the final list" } });
    });
    expect(cached()?.text).toBe("Send the final list");
  });

  it("applyPatch sets the picked assignee and clears it on null", () => {
    const sarah = { id: 9, display_name: "Sarah" };
    const assigned = applyPatch(base, {
      id: 5,
      patch: { assignee_participant_id: 9 },
      assignee: sarah,
    });
    expect(assigned.assignee).toEqual(sarah);
    expect(
      applyPatch(assigned, { id: 5, patch: { assignee_participant_id: null } }).assignee,
    ).toBeNull();
    expect(applyPatch(base, { id: 5, patch: { due_date: "2026-10-12" } }).due_date).toBe(
      "2026-10-12",
    );
  });
});
