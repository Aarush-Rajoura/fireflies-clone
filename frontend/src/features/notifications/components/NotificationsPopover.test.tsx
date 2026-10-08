import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/components/ui";
import type { Notification, Page } from "@/lib/api";

import { fetchNotifications, markAllNotificationsRead, setNotificationRead } from "../api";

import { NotificationsPopover } from "./NotificationsPopover";

vi.mock("../api", () => ({
  fetchNotifications: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  setNotificationRead: vi.fn(),
}));

const note = (over: Partial<Notification>): Notification => ({
  id: 1,
  kind: "meeting_created",
  title: "Launch is ready",
  body: "Transcript and AI summary are ready.",
  link: "/meetings/7",
  read_at: null,
  created_at: new Date().toISOString(),
  ...over,
});

const pageOf = (items: Notification[]): Page<Notification> => ({
  items,
  page: 1,
  page_size: 20,
  total: items.length,
  total_pages: 1,
  has_next: false,
});

function renderBell() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AppProviders>
        <NotificationsPopover />
      </AppProviders>
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("NotificationsPopover", () => {
  it("shows the unread dot and lists notifications unread first", async () => {
    vi.mocked(fetchNotifications).mockResolvedValue(
      pageOf([
        note({}),
        note({
          id: 2,
          kind: "calendar_connected",
          title: "Google Calendar connected",
          read_at: new Date().toISOString(),
        }),
      ]),
    );
    renderBell();
    const bell = await screen.findByRole("button", { name: "Notifications (unread)" });
    expect(screen.getByTestId("unread-dot")).toBeTruthy();

    fireEvent.click(bell);
    const links = await screen.findAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual([
      expect.stringContaining("Launch is ready"),
      expect.stringContaining("Google Calendar connected"),
    ]);
    expect(links[0]?.getAttribute("href")).toBe("/meetings/7");
  });

  it("mark all read clears the dot optimistically", async () => {
    vi.mocked(fetchNotifications).mockResolvedValueOnce(pageOf([note({})]));
    let release: () => void = () => undefined;
    vi.mocked(markAllNotificationsRead).mockReturnValue(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    renderBell();
    fireEvent.click(await screen.findByRole("button", { name: "Notifications (unread)" }));
    fireEvent.click(await screen.findByRole("button", { name: "Mark all read" }));

    await waitFor(() => expect(screen.queryByTestId("unread-dot")).toBeNull());
    expect(markAllNotificationsRead).toHaveBeenCalledTimes(1);
    vi.mocked(fetchNotifications).mockResolvedValue(
      pageOf([note({ read_at: new Date().toISOString() })]),
    );
    release();
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "Mark all read" }) as HTMLButtonElement).disabled,
      ).toBe(true),
    );
  });

  it("opening an unread notification marks it read", async () => {
    vi.mocked(fetchNotifications).mockResolvedValue(pageOf([note({})]));
    vi.mocked(setNotificationRead).mockResolvedValue(note({ read_at: new Date().toISOString() }));
    renderBell();
    fireEvent.click(await screen.findByRole("button", { name: "Notifications (unread)" }));
    fireEvent.click(await screen.findByRole("link"));
    await waitFor(() => expect(setNotificationRead).toHaveBeenCalledWith(1, true));
  });

  it("is all caught up when empty", async () => {
    vi.mocked(fetchNotifications).mockResolvedValue(pageOf([]));
    renderBell();
    fireEvent.click(await screen.findByRole("button", { name: "Notifications" }));
    expect(await screen.findByText("You're all caught up")).toBeTruthy();
    expect(screen.queryByTestId("unread-dot")).toBeNull();
  });
});
