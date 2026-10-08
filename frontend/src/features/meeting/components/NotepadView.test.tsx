import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VirtualClockEngine } from "@/features/player";
import type { Summary, Transcript } from "@/lib/api";

import { errorJson, json, meeting, routeFetch, type Route } from "../testing/fixtures";
import { renderWithClient } from "../testing/render";
import { NotepadView } from "./NotepadView";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  usePathname: () => "/meetings/7",
}));

const transcript: Transcript = {
  speakers: [
    { id: 1, label: "Speaker 1", name: "Sarah Watts", color_index: 0, participant_id: 11 },
    { id: 2, label: "Speaker 2", name: "Janice", color_index: 2, participant_id: 12 },
  ],
  segments: [0, 3_000, 6_000, 9_000, 12_000].map((start_ms, i) => ({
    id: 100 + i,
    sequence: i,
    speaker_id: (i % 2) + 1,
    start_ms,
    end_ms: start_ms + 2_900,
    text: `Line ${i + 1} about the launch.`,
    original_text: `Line ${i + 1} about the launch.`,
    is_edited: false,
  })),
};

const summary: Summary = {
  overview: "We decided to launch.",
  keywords: ["launch"],
  outline: [
    { title: "Opening", start_ms: 0 },
    { title: "Decision", start_ms: 9_000 },
  ],
  notes: [],
  provider: "mock",
  model: null,
  generated_at: "2026-03-15T12:00:00Z",
  is_stale: false,
};

const emptyPage = { items: [], page: 1, page_size: 100, total: 0, total_pages: 0, has_next: false };

const meetingRoutes =
  (detail: () => Response): Route =>
  (req, url) => {
    switch (url.pathname) {
      case "/api/v1/meetings/7":
        return detail();
      case "/api/v1/meetings/7/transcript":
        return json(transcript);
      case "/api/v1/meetings/7/summary":
        return json(summary);
      case "/api/v1/meetings/7/action-items":
        return json(emptyPage);
      case "/api/v1/meetings/7/restore":
        return req.method === "POST" ? json(meeting) : undefined;
    }
    return undefined;
  };

let engine: VirtualClockEngine | undefined;
const createEngine = ({ durationMs }: { durationMs: number }) => {
  engine = new VirtualClockEngine({ durationMs });
  return engine;
};

function renderView(route: Route, props: { t?: string; edit?: boolean } = {}) {
  vi.stubGlobal("fetch", vi.fn(routeFetch(route)));
  return renderWithClient(<NotepadView meetingId={7} createEngine={createEngine} {...props} />);
}

const activeLine = () =>
  document.querySelector<HTMLElement>('[data-segment-index][aria-current="true"]')?.textContent ??
  "";

describe("NotepadView", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    engine = undefined;
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows the deleted state on 410 and restores the meeting in place", async () => {
    let deleted = true;
    renderView(meetingRoutes(() => (deleted ? errorJson(410, "MEETING_DELETED") : json(meeting))));
    expect(await screen.findByText("This meeting was deleted")).toBeTruthy();
    deleted = false;
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(await screen.findByRole("heading", { level: 1, name: meeting.title })).toBeTruthy();
  });

  it("shows not found on 404", async () => {
    renderView(meetingRoutes(() => errorJson(404, "MEETING_NOT_FOUND")));
    expect(await screen.findByText("Meeting not found")).toBeTruthy();
  });

  it("drives summary and transcript from one player: an outline timestamp moves the active line", async () => {
    renderView(meetingRoutes(() => json(meeting)));
    await screen.findByText("Line 1 about the launch.");
    await screen.findByText("We decided to launch.");
    expect(screen.getByRole("region", { name: "Media player" })).toBeTruthy();
    expect(screen.getByRole("separator", { name: "Resize summary and transcript" })).toBeTruthy();
    await waitFor(() => expect(activeLine()).toContain("Line 1"));

    fireEvent.click(screen.getByRole("button", { name: "Jump to Decision at 00:09" }));
    await waitFor(() => expect(activeLine()).toContain("Line 4"));
    expect(engine?.currentMs).toBe(9_000);

    // And the other way: a transcript line seeks the same clock.
    fireEvent.click(screen.getByText("Line 2 about the launch."));
    await waitFor(() => expect(activeLine()).toContain("Line 2"));
    expect(engine?.currentMs).toBe(3_000);
  });

  it("applies the ?t= deep link and hides/shows the player with the media toggle", async () => {
    renderView(
      meetingRoutes(() => json(meeting)),
      { t: "12" },
    );
    await screen.findByText("Line 5 about the launch.");
    await waitFor(() => expect(activeLine()).toContain("Line 5"));
    const toggle = screen.getByRole("button", { name: "Player" });
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(
      screen.getByRole("region", { name: "Media player", hidden: true }).parentElement?.className,
    ).toContain("hidden");
  });

  it("opens the edit modal for ?edit=1 and drops the param on close", async () => {
    renderView(
      meetingRoutes(() => json(meeting)),
      { edit: true },
    );
    const dialog = await screen.findByRole("dialog", { name: "Edit meeting" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(replace).toHaveBeenCalledWith("/meetings/7", { scroll: false });
  });
});
