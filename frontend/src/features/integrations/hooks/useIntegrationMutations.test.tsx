import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getToasts, resetToasts, runAction } from "@/components/ui/toast-store";
import { qk, type Integration, type Page } from "@/lib/api";

import * as api from "../api";

import { useConnectIntegration, useDisconnectIntegration } from "./useIntegrationMutations";

vi.mock("../api", () => ({
  connectIntegration: vi.fn(),
  disconnectIntegration: vi.fn(),
}));

const KEY = qk.integrations.list({ page_size: 100 });

function integration(overrides: Partial<Integration> = {}): Integration {
  return {
    key: "slack",
    name: "Slack",
    vendor: "Slack",
    category: "collaboration",
    description: "Post recaps.",
    featured: false,
    connected: false,
    connected_at: null,
    ...overrides,
  };
}

function setup<T>(hook: () => T, items: Integration[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const page: Page<Integration> = {
    items,
    page: 1,
    page_size: 100,
    total: items.length,
    total_pages: 1,
    has_next: false,
  };
  client.setQueryData(KEY, page);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const cached = () => client.getQueryData<Page<Integration>>(KEY)?.items[0];
  return { result: renderHook(hook, { wrapper }).result, cached };
}

beforeEach(() => resetToasts());
afterEach(() => resetToasts());

describe("integration mutations", () => {
  it("connect marks the cached card connected and says it is a demo", async () => {
    const at = "2026-10-08T10:00:00Z";
    vi.mocked(api.connectIntegration).mockResolvedValue(
      integration({ connected: true, connected_at: at }),
    );
    const { result, cached } = setup(() => useConnectIntegration(), [integration()]);

    act(() => result.current.mutate(integration()));
    await waitFor(() => expect(cached()).toMatchObject({ connected: true, connected_at: at }));
    expect(api.connectIntegration).toHaveBeenCalledWith("slack");
    expect(getToasts().map((t) => t.message)).toContain("Slack connected (demo)");
  });

  it("disconnect clears the card and Undo reconnects", async () => {
    vi.mocked(api.disconnectIntegration).mockResolvedValue(undefined);
    vi.mocked(api.connectIntegration).mockResolvedValue(integration({ connected: true }));
    const connected = integration({ connected: true, connected_at: "2026-10-08T10:00:00Z" });
    const { result, cached } = setup(() => useDisconnectIntegration(), [connected]);

    act(() => result.current.mutate(connected));
    await waitFor(() => expect(cached()).toMatchObject({ connected: false, connected_at: null }));

    const undo = getToasts().find((t) => t.action?.label === "Undo");
    expect(undo?.message).toBe("Slack disconnected");
    act(() => runAction(undo!));
    await waitFor(() => expect(api.connectIntegration).toHaveBeenCalledWith("slack"));
  });
});
