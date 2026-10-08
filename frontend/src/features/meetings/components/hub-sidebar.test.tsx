import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/components/ui";
import { ChannelSidebar } from "@/features/channels";

import { useMeetingsParams } from "../hooks/useMeetingsParams";

const nav = vi.hoisted(() => ({ search: "", push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/meetings",
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
}));

// The sidebar's only HTTP: the channel list.
vi.mock("@/features/channels/api", () => ({
  fetchChannels: vi.fn(async () => ({
    items: [{ id: 4, name: "sales", slug: "sales", is_private: false, meeting_count: 2 }],
    page: 1,
    page_size: 100,
    total: 1,
    total_pages: 1,
    has_next: false,
  })),
}));

/** The same wiring MeetingsHub uses: sidebar clicks become URL changes. */
function Harness() {
  const url = useMeetingsParams();
  return (
    <ChannelSidebar
      activeScope={url.params.scope}
      activeChannelId={url.params.channel}
      onSelectScope={(scope) => url.selectView({ scope })}
      onSelectChannel={(channel) => url.selectView({ channel })}
    />
  );
}

function renderSidebar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AppProviders>
        <Harness />
      </AppProviders>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  nav.search = "";
  nav.push.mockReset();
  nav.replace.mockReset();
});

describe("ChannelSidebar in the hub", () => {
  it("marks the view from the URL as current", () => {
    nav.search = "scope=hosted";
    renderSidebar();
    expect(screen.getByRole("button", { name: "My Meetings" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(
      screen.getByRole("button", { name: /All Meetings/ }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("writes the chosen scope to the URL, keeping filters but resetting the page", () => {
    nav.search = "page=2&q=roadmap";
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "My Meetings" }));
    expect(nav.push).toHaveBeenCalledWith("/meetings?q=roadmap&scope=hosted", { scroll: false });
    fireEvent.click(screen.getByRole("button", { name: /Uploads/ }));
    expect(nav.push).toHaveBeenLastCalledWith("/meetings?q=roadmap&scope=uploads", {
      scroll: false,
    });
  });

  it("selects a channel by id and drops the scope", async () => {
    nav.search = "scope=hosted";
    renderSidebar();
    fireEvent.click(await screen.findByRole("button", { name: /^sales/ }));
    expect(nav.push).toHaveBeenCalledWith("/meetings?channel=4", { scroll: false });
  });

  it("filters the channel list as you type", async () => {
    renderSidebar();
    await screen.findByRole("button", { name: /^sales/ });
    fireEvent.change(screen.getByRole("searchbox", { name: "Search channels" }), {
      target: { value: "zz" },
    });
    expect(screen.queryByRole("button", { name: /^sales/ })).toBeNull();
    expect(screen.getByText(/No channels match/)).toBeTruthy();
  });
});
