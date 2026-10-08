import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AnalyticsRange } from "@/lib/api";

import { AnalyticsView } from "./AnalyticsView";

const push = vi.fn();
const nav = { params: new URLSearchParams() };
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/analytics",
  useSearchParams: () => nav.params,
}));

const requested = vi.fn<(range: AnalyticsRange) => void>();
vi.mock("../hooks/useAnalyticsOverview", () => ({
  useAnalyticsOverview: (range: AnalyticsRange) => {
    requested(range);
    return {
      isLoading: true,
      isError: false,
      isPlaceholderData: false,
      data: undefined,
      tz: "UTC",
    };
  },
}));

const selected = () =>
  screen.getAllByRole("tab").find((r) => r.getAttribute("aria-selected") === "true");

describe("AnalyticsView range", () => {
  beforeEach(() => {
    push.mockClear();
    requested.mockClear();
    nav.params = new URLSearchParams();
  });

  it("falls back to 30 days for a missing or unknown range", () => {
    nav.params = new URLSearchParams("range=bogus");
    render(<AnalyticsView />);
    expect(requested).toHaveBeenLastCalledWith("30d");
  });

  it("follows the URL when it changes after mount (back/forward, pasted link)", () => {
    nav.params = new URLSearchParams("range=7d");
    const { rerender } = render(<AnalyticsView />);
    expect(requested).toHaveBeenLastCalledWith("7d");

    nav.params = new URLSearchParams("range=90d");
    rerender(<AnalyticsView />);
    expect(requested).toHaveBeenLastCalledWith("90d");
    expect(selected()?.textContent).toMatch(/90/);

    nav.params = new URLSearchParams();
    rerender(<AnalyticsView />);
    expect(requested).toHaveBeenLastCalledWith("30d");
  });

  it("pushes the new range to the URL instead of holding it in state", () => {
    render(<AnalyticsView />);
    act(() => {
      fireEvent.click(screen.getAllByRole("tab")[0]!);
    });
    expect(push).toHaveBeenCalledTimes(1);
    expect(push.mock.calls[0]![0]).toMatch(/^\/analytics\?range=7d$/);
    // Still showing the URL's range until the URL actually changes.
    expect(requested).toHaveBeenLastCalledWith("30d");
  });
});
