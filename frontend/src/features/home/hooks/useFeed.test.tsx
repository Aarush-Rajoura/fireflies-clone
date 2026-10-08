import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { fetchFeed } from "../api";
import { page } from "../testing/fixtures";

import { useFeed } from "./useFeed";

vi.mock("../api", () => ({ fetchFeed: vi.fn() }));

describe("useFeed", () => {
  it("refetches on every mount so writes elsewhere show up", async () => {
    vi.mocked(fetchFeed).mockResolvedValue(page([]));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const first = renderHook(() => useFeed(), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();
    renderHook(() => useFeed(), { wrapper });
    await waitFor(() => expect(fetchFeed).toHaveBeenCalledTimes(2));
  });
});
