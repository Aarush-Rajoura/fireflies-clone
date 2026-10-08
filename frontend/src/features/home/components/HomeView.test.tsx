import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/components/ui";
import type { MeetingListParams } from "@/lib/api";

import { fetchCalendarConnections, fetchFeed, fetchMeetingList } from "../api";
import { listItem, page, stubResizeObserver } from "../testing/fixtures";

import { HomeView } from "./HomeView";

const nav = { search: "" };
const replace = vi.fn((url: string) => {
  nav.search = url.split("?")[1] ?? "";
});
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  usePathname: () => "/home",
  useSearchParams: () => new URLSearchParams(nav.search),
}));
vi.mock("@/features/user", () => ({
  useMe: () => ({ data: { id: 1, name: "Ada Lovelace", email: "a@x.io" }, isLoading: false }),
}));
vi.mock("../api", () => ({
  fetchMeetingList: vi.fn(),
  fetchFeed: vi.fn(),
  fetchCalendarConnections: vi.fn(),
  connectCalendar: vi.fn(),
  createMeeting: vi.fn(),
}));

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AppProviders>
        <HomeView />
      </AppProviders>
    </QueryClientProvider>,
  );
}

beforeAll(stubResizeObserver);

beforeEach(() => {
  vi.clearAllMocks();
  nav.search = "";
  vi.mocked(fetchMeetingList).mockImplementation(async (query: MeetingListParams) =>
    query.status === "upcoming"
      ? page([
          listItem({
            id: 9,
            title: "Design review",
            status: "scheduled",
            platform: "meet",
            auto_join: true,
          }),
        ])
      : page([listItem()]),
  );
  vi.mocked(fetchFeed).mockResolvedValue(
    page([
      {
        kind: "summary",
        title: "Roadmap",
        body: "We locked the roadmap.",
        meeting_id: 3,
        created_at: new Date().toISOString(),
      },
    ]),
  );
  vi.mocked(fetchCalendarConnections).mockResolvedValue(page([]));
});

describe("HomeView", () => {
  it("greets the user and lists the five latest finished meetings", async () => {
    renderHome();
    expect(screen.getByRole("heading", { name: "Welcome Aboard, Ada!" })).toBeTruthy();
    const list = await screen.findByRole("list", { name: "Recent meetings" });
    expect(
      within(list).getByRole("link", { name: "Fireflies AI Platform Quick Overview" }),
    ).toBeTruthy();
    expect(within(list).getByText(/2024,/)).toBeTruthy();
    expect(vi.mocked(fetchMeetingList).mock.calls[0]?.[0]).toEqual({
      status: "completed",
      sort: "-started_at",
      page_size: 5,
    });
  });

  it("switches tabs through the URL and shows upcoming and feed items", async () => {
    const { rerender } = renderHome();
    fireEvent.click(screen.getByRole("tab", { name: "Upcoming" }));
    expect(replace).toHaveBeenCalledWith("/home?tab=upcoming", { scroll: false });

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <AppProviders>
          <HomeView />
        </AppProviders>
      </QueryClientProvider>,
    );
    const upcoming = await screen.findByRole("list", { name: "Upcoming meetings" });
    expect(within(upcoming).getByText("Google Meet")).toBeTruthy();
    expect(within(upcoming).getByText("Auto-join")).toBeTruthy();

    nav.search = "tab=ai-feed";
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <AppProviders>
          <HomeView />
        </AppProviders>
      </QueryClientProvider>,
    );
    expect(await screen.findByText("We locked the roadmap.")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "AI Feed" }).getAttribute("aria-selected")).toBe("true");
  });

  it("opens the schedule, capture and upload flows from Quick Start", async () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Schedule Meeting" }));
    expect(await screen.findByRole("dialog", { name: "Schedule a meeting" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Capture Meeting" }));
    expect(await screen.findByRole("dialog", { name: "Add Fred to a live meeting" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Upload File" }));
    expect(await screen.findByRole("dialog", { name: "Upload a recording" })).toBeTruthy();
  });

  it("opens the looping demo preview from the banner thumbnail", async () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Play the product demo" }));
    expect(await screen.findByRole("dialog", { name: "Fireflies product demo" })).toBeTruthy();
    expect(screen.getByRole("img", { name: /meeting being transcribed/ })).toBeTruthy();
  });
});
