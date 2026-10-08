import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getToasts, resetToasts, runAction } from "@/components/ui/toast-store";
import { qk } from "@/lib/api";
import { makeQueryClient } from "@/lib/query/query-client";

import { json, meeting, routeFetch } from "../testing/fixtures";
import { useDeleteMeeting } from "./useDeleteMeeting";
import { useUpdateMeeting } from "./useUpdateMeeting";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function setup() {
  const client = makeQueryClient(() => undefined);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe("meeting mutations", () => {
  let calls: string[];
  beforeEach(() => {
    calls = [];
    push.mockReset();
    resetToasts();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        routeFetch((req, url) => {
          calls.push(`${req.method} ${url.pathname}`);
          if (req.method === "PATCH") return json(meeting);
          if (req.method === "DELETE") return json(null, 204);
          if (url.pathname.endsWith("/restore")) return json(meeting);
          return undefined;
        }),
      ),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("refreshes transcript and action items only when participants change", async () => {
    const { client, wrapper } = setup();
    const spy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpdateMeeting(7), { wrapper });
    await act(() => result.current.mutateAsync({ title: "New" }));
    const keys = () => spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keys()).not.toContain(JSON.stringify(qk.transcript(7)));
    expect(keys()).not.toContain(JSON.stringify(qk.actionItems(7)));
    await act(() => result.current.mutateAsync({ participants: [{ display_name: "Dana" }] }));
    expect(keys()).toContain(JSON.stringify(qk.transcript(7)));
    expect(keys()).toContain(JSON.stringify(qk.actionItems(7)));
  });

  it("delete navigates away; Undo restores once and offers View", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useDeleteMeeting(7), { wrapper });
    await act(() => result.current.mutateAsync());
    expect(push).toHaveBeenCalledWith("/meetings");
    const undo = getToasts().find((t) => t.action?.label === "Undo")!;
    undo.action!.onClick();
    undo.action!.onClick(); // a double click before the toast goes away
    await waitFor(() =>
      expect(getToasts().some((t) => t.message === "Meeting restored")).toBe(true),
    );
    expect(calls.filter((c) => c.endsWith("/restore"))).toHaveLength(1);
    const restored = getToasts().find((t) => t.message === "Meeting restored")!;
    expect(restored.action?.label).toBe("View");
    runAction(restored);
    expect(push).toHaveBeenLastCalledWith("/meetings/7");
  });
});
