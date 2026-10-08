import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getToasts, resetToasts } from "@/components/ui/toast-store";
import { ApiError, qk, type MeetingComment, type User } from "@/lib/api";

import { createComment, deleteComment, updateComment } from "../api";
import { useCreateComment, useDeleteComment, useUpdateComment } from "./useCommentMutations";

vi.mock("../api", () => ({
  createComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
  fetchComments: vi.fn(() => new Promise(() => {})),
}));

const me: User = { id: 3, name: "Aarush", email: "a@example.com", avatar_url: null };

const comment = (id: number, body = `Comment ${id}`): MeetingComment => ({
  id,
  meeting_id: 1,
  segment_id: 101,
  author: { id: 3, name: "Aarush", avatar_url: null },
  body,
  created_at: "2026-10-08T10:00:00Z",
  updated_at: "2026-10-08T10:00:00Z",
});

function setup<T>(hook: () => T, initial: MeetingComment[]) {
  const client = new QueryClient();
  client.setQueryData(qk.comments(1), initial);
  client.setQueryData(qk.me(), me);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(hook, { wrapper });
  const list = () => client.getQueryData<MeetingComment[]>(qk.comments(1)) ?? [];
  return { result, list };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("comment mutations", () => {
  afterEach(() => {
    resetToasts();
    vi.clearAllMocks();
  });

  it("create shows a pending comment by me at once, then swaps in the stored one", async () => {
    const { result, list } = setup(() => useCreateComment(1), [comment(1)]);
    const call = deferred<MeetingComment>();
    vi.mocked(createComment).mockReturnValue(call.promise);

    act(() => result.current.mutate({ body: "  Ship it  ", segment_id: 101 }));
    await waitFor(() => expect(list()).toHaveLength(2));
    const pending = list()[1]!;
    expect(pending.id).toBeLessThan(0);
    expect(pending).toMatchObject({ body: "Ship it", segment_id: 101, author: { id: 3 } });
    expect(createComment).toHaveBeenCalledWith(1, { body: "  Ship it  ", segment_id: 101 });

    await act(async () => call.resolve(comment(7, "Ship it")));
    await waitFor(() => expect(list().map((c) => c.id)).toEqual([1, 7]));
  });

  it("create withdraws the pending comment and explains a refusal", async () => {
    const { result, list } = setup(() => useCreateComment(1), [comment(1)]);
    vi.mocked(createComment).mockRejectedValue(
      new ApiError("SEGMENT_NOT_IN_MEETING", 422, "Segment does not belong to this meeting"),
    );
    await act(async () => {
      await result.current.mutateAsync({ body: "Hi", segment_id: 999 }).catch(() => undefined);
    });
    expect(list().map((c) => c.id)).toEqual([1]);
    expect(getToasts().map((t) => t.message)).toContain("That line isn't part of this meeting.");
  });

  it("update edits in place and puts only the body back on failure", async () => {
    const { result, list } = setup(() => useUpdateComment(1), [comment(1), comment(2)]);
    const call = deferred<MeetingComment>();
    vi.mocked(updateComment).mockReturnValue(call.promise);

    act(() => result.current.mutate({ id: 2, body: "Edited " }));
    await waitFor(() => expect(list()[1]?.body).toBe("Edited"));
    expect(updateComment).toHaveBeenCalledWith(2, { body: "Edited " });

    await act(async () => call.reject(new ApiError("X", 500, "Server down")));
    await waitFor(() => expect(list()[1]?.body).toBe("Comment 2"));
    expect(getToasts().map((t) => t.message)).toContain("Server down");
  });

  it("delete removes at once and restores the comment at its place on failure", async () => {
    const { result, list } = setup(() => useDeleteComment(1), [comment(1), comment(2), comment(3)]);
    const call = deferred<void>();
    vi.mocked(deleteComment).mockReturnValue(call.promise);

    act(() => result.current.mutate(2));
    await waitFor(() => expect(list().map((c) => c.id)).toEqual([1, 3]));

    await act(async () => call.reject(new ApiError("X", 500, "down")));
    await waitFor(() => expect(list().map((c) => c.id)).toEqual([1, 2, 3]));
  });

  it("delete confirms with a toast when the server agrees", async () => {
    const { result, list } = setup(() => useDeleteComment(1), [comment(1)]);
    vi.mocked(deleteComment).mockResolvedValue(undefined);
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(list()).toEqual([]);
    expect(getToasts().map((t) => t.message)).toContain("Comment deleted");
  });
});
