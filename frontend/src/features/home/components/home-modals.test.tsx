import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/components/ui";
import { getToasts, resetToasts } from "@/components/ui/toast-store";
import { ApiError } from "@/lib/api";

import { connectCalendar, createMeeting, fetchCalendarConnections } from "../api";
import { detail, page, stubResizeObserver } from "../testing/fixtures";

import { CaptureModal } from "./CaptureModal";
import { ScheduleModal } from "./ScheduleModal";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock("../api", () => ({
  connectCalendar: vi.fn(),
  createMeeting: vi.fn(),
  fetchCalendarConnections: vi.fn(),
  fetchMeetingList: vi.fn(),
  fetchFeed: vi.fn(),
}));

function renderInApp(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AppProviders>{ui}</AppProviders>
    </QueryClientProvider>,
  );
}

beforeAll(stubResizeObserver);

beforeEach(() => {
  vi.clearAllMocks();
  resetToasts();
  vi.mocked(fetchCalendarConnections).mockResolvedValue(page([]));
});

describe("ScheduleModal", () => {
  it("connects Google Calendar with a demo toast and closes", async () => {
    const onOpenChange = vi.fn();
    const onScheduled = vi.fn();
    vi.mocked(connectCalendar).mockResolvedValue({
      id: 1,
      provider: "google",
      connected_at: new Date().toISOString(),
    });
    renderInApp(<ScheduleModal open onOpenChange={onOpenChange} onScheduled={onScheduled} />);

    fireEvent.click(screen.getByRole("button", { name: "Connect Google Calendar" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(vi.mocked(connectCalendar).mock.calls[0]?.[0]).toBe("google");
    expect(onScheduled).toHaveBeenCalled();
    expect(getToasts().map((t) => t.message)).toContain(
      "Demo connection — 3 sample meetings imported",
    );
  });

  it("shows an already connected provider as connected", async () => {
    vi.mocked(fetchCalendarConnections).mockResolvedValue(
      page([{ id: 1, provider: "outlook", connected_at: new Date().toISOString() }]),
    );
    renderInApp(<ScheduleModal open onOpenChange={vi.fn()} />);
    const button = await screen.findByRole("button", { name: "Outlook connected" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("validates, then posts a scheduled meeting", async () => {
    const onOpenChange = vi.fn();
    vi.mocked(createMeeting).mockResolvedValue(detail({ id: 42, status: "scheduled" }));
    renderInApp(<ScheduleModal open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Schedule" }));
    expect(await screen.findByText("Give the meeting a name")).toBeTruthy();
    expect(createMeeting).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Meeting name"), { target: { value: "Planning" } });
    fireEvent.change(screen.getByLabelText("Meeting link"), {
      target: { value: "https://zoom.us/j/1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Schedule" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    const body = vi.mocked(createMeeting).mock.calls[0]?.[0];
    expect(body).toMatchObject({
      title: "Planning",
      status: "scheduled",
      meeting_url: "https://zoom.us/j/1",
      auto_join: true,
    });
    expect(new Date(body?.started_at ?? 0).getTime()).toBeGreaterThan(Date.now());
  });

  it("maps a server 'in the past' rejection onto the date field", async () => {
    vi.mocked(createMeeting).mockRejectedValue(
      new ApiError("SCHEDULED_IN_PAST", 422, "A scheduled meeting must start in the future"),
    );
    renderInApp(<ScheduleModal open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Meeting name"), { target: { value: "Late" } });
    fireEvent.click(screen.getByRole("button", { name: "Schedule" }));
    expect(await screen.findByText("Pick a time in the future")).toBeTruthy();
  });
});

describe("CaptureModal", () => {
  it("creates a live meeting, toasts and opens it", async () => {
    vi.mocked(createMeeting).mockResolvedValue(detail({ id: 42, status: "live" }));
    renderInApp(<CaptureModal open onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Meeting name"), { target: { value: "Standup" } });
    fireEvent.change(screen.getByLabelText("Meeting link"), {
      target: { value: "https://meet.google.com/abc" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add to meeting" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/meetings/42"));
    expect(vi.mocked(createMeeting).mock.calls[0]?.[0]).toMatchObject({
      title: "Standup",
      status: "live",
      meeting_url: "https://meet.google.com/abc",
      language: "en",
    });
    expect(getToasts().map((t) => t.message)).toContain("Fred is joining… (demo)");
  });

  it("requires a link before calling the API", async () => {
    renderInApp(<CaptureModal open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Meeting name"), { target: { value: "Standup" } });
    fireEvent.click(screen.getByRole("button", { name: "Add to meeting" }));
    expect(await screen.findByText("Paste the meeting link")).toBeTruthy();
    expect(createMeeting).not.toHaveBeenCalled();
  });
});
