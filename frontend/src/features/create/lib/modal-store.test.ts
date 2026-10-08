import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { closeCreateMeeting, openCreateMeeting, useCreateMeetingModal } from "./modal-store";

afterEach(() => act(() => closeCreateMeeting()));

describe("create-meeting modal store", () => {
  it("opens on a tab from outside React and every subscriber sees it", () => {
    const a = renderHook(() => useCreateMeetingModal());
    const b = renderHook(() => useCreateMeetingModal());
    expect(a.result.current.isOpen).toBe(false);

    act(() => openCreateMeeting("paste"));
    expect(a.result.current).toMatchObject({ isOpen: true, tab: "paste" });
    expect(b.result.current).toMatchObject({ isOpen: true, tab: "paste" });

    act(() => a.result.current.setTab("form"));
    expect(b.result.current.tab).toBe("form");

    act(() => b.result.current.close());
    expect(a.result.current.isOpen).toBe(false);
  });

  it("defaults to the upload tab", () => {
    const hook = renderHook(() => useCreateMeetingModal());
    act(() => openCreateMeeting());
    expect(hook.result.current.tab).toBe("upload");
  });
});
