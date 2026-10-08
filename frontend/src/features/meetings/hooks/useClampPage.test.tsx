import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { meetingFixture } from "../testing/fixtures";

import { useClampPage } from "./useClampPage";

const page = (over: { page: number; total: number; total_pages: number; items?: unknown[] }) => ({
  items: [],
  page_size: 20,
  has_next: false,
  ...over,
});

describe("useClampPage", () => {
  it("replaces an out-of-range page with the last real one", () => {
    const setPage = vi.fn();
    renderHook(() => useClampPage(page({ page: 9, total: 41, total_pages: 3 }), false, setPage));
    expect(setPage).toHaveBeenCalledWith(3, "replace");
  });

  it("leaves in-range, truly empty and placeholder pages alone", () => {
    const setPage = vi.fn();
    renderHook(() =>
      useClampPage(
        page({ page: 2, total: 21, total_pages: 2, items: [meetingFixture()] }),
        false,
        setPage,
      ),
    );
    renderHook(() => useClampPage(page({ page: 1, total: 0, total_pages: 0 }), false, setPage));
    renderHook(() => useClampPage(page({ page: 9, total: 41, total_pages: 3 }), true, setPage));
    expect(setPage).not.toHaveBeenCalled();
  });
});
