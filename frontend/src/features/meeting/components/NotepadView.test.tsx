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
  useSearchParams: () => new URLSearchParams("t=12&edit=1&ref=mail"),
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
const page = <T,>(items: T[]) => ({ ...emptyPage, items, total: items.length, total_pages: 1 });

const annotationComment = {
  id: 1,
  meeting_id: 7,
  segment_id: 101,
  author: { id: 3, name: "Sarah Watts", avatar_url: null },
  body: "Is this the final launch date?",
  created_at: "2026-03-15T12:00:00Z",
  updated_at: "2026-03-15T12:00:00Z",
};
const annotationHighlight = {
  id: 4,
  meeting_id: 7,
  segment_id: 102,
  start_offset: 7,
  end_offset: 12,
  color: "blue",
  created_by: 3,
};
const annotationClip = {
  id: 9,
  meeting_id: 7,
  title: "Launch call",
  start_ms: 3_000,
  end_ms: 8_000,
  duration_ms: 5_000,
  created_by: 3,
};

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
      case "/api/v1/meetings/7/comments":
        return json(page([annotationComment]));
      case "/api/v1/meetings/7/highlights":
        return json(page([annotationHighlight]));
      case "/api/v1/meetings/7/soundbites":
        return json(page([annotationClip]));
      case "/api/v1/me":
        return json({ id: 3, name: "Sarah Watts", email: "s@example.com", avatar_url: null });
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

  it("opens Ask Fred in the tool rail's flyout from the header or the rail", async () => {
    renderView(meetingRoutes(() => json(meeting)));
    await screen.findByText("Line 1 about the launch.");
    const rail = screen.getByRole("navigation", { name: "Meeting tools" });
    const railButton = within(rail).getByRole("button", { name: "Ask Fred" });
    const toggle = screen
      .getAllByRole("button", { name: "Ask Fred" })
      .find((b) => !rail.contains(b))!;
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    // Browsers focus a clicked button; jsdom does not, so do it as they would.
    toggle.focus();
    fireEvent.click(toggle);
    const panel = screen.getByRole("complementary", { name: "Ask Fred" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(railButton.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.getAttribute("aria-controls")).toBe(panel.id);
    expect(railButton.getAttribute("aria-controls")).toBe(panel.id);
    await waitFor(() => expect(document.activeElement).toBe(within(panel).getByRole("textbox")));

    fireEvent.click(within(panel).getByRole("button", { name: "Close Ask Fred" }));
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(toggle);

    // From the rail, and Escape inside the panel closes it back to the rail button.
    railButton.focus();
    fireEvent.click(railButton);
    expect(panel.parentElement?.className).not.toContain("hidden");
    fireEvent.keyDown(within(panel).getByRole("textbox"), { key: "Escape" });
    expect(document.activeElement).toBe(railButton);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
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

  it("opens the edit modal for ?edit=1 and drops only that param on close", async () => {
    renderView(
      meetingRoutes(() => json(meeting)),
      { edit: true },
    );
    const dialog = await screen.findByRole("dialog", { name: "Edit meeting" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(replace).toHaveBeenCalledWith("/meetings/7?t=12&ref=mail", { scroll: false });
  });

  it("composes highlights, comment badges and the tool rail's flyouts", async () => {
    renderView(meetingRoutes(() => json(meeting)));
    await screen.findByText("Line 1 about the launch.");

    // Highlight on line 3 ("Line 3 about the launch." -> "about"), badge on line 2.
    await waitFor(() =>
      expect(document.querySelector('mark[data-range-id="4"]')?.textContent).toBe("about"),
    );
    const badge = await screen.findByRole("button", { name: "1 comment on this line" });
    expect(badge.closest("[data-segment-index]")?.getAttribute("data-segment-index")).toBe("1");

    const rail = screen.getByRole("navigation", { name: "Meeting tools" });
    fireEvent.click(within(rail).getByRole("button", { name: "Soundbites (1)" }));
    const clips = await screen.findByRole("complementary", { name: "Soundbites" });
    expect(within(clips).getByText("Launch call")).toBeTruthy();

    // The badge opens that line's thread, ready to reply at its timestamp.
    fireEvent.click(badge);
    const comments = await screen.findByRole("complementary", { name: "Comments" });
    expect(within(comments).getByText("Is this the final launch date?")).toBeTruthy();
    expect(within(comments).getByText("Line at 0:03")).toBeTruthy();
    expect(clips.parentElement?.className).toContain("hidden");

    // Its timestamp chip seeks the shared player.
    fireEvent.click(within(comments).getByRole("button", { name: "Jump to 0:03" }));
    await waitFor(() => expect(engine?.currentMs).toBe(3_000));

    fireEvent.click(within(rail).getByRole("button", { name: "Comments (1)" }));
    expect(comments.parentElement?.parentElement?.className).toContain("hidden");

    // Closing from the panel hands focus back to the rail button that opened it.
    const commentsButton = within(rail).getByRole("button", { name: "Comments (1)" });
    // Browsers focus a clicked button; jsdom does not, so do it as they would.
    commentsButton.focus();
    fireEvent.click(commentsButton);
    fireEvent.click(within(comments).getByRole("button", { name: "Close Comments" }));
    expect(document.activeElement).toBe(commentsButton);

    fireEvent.click(within(rail).getByRole("button", { name: "Bookmarks" }));
    const bookmarks = await screen.findByRole("complementary", { name: "Bookmarks" });
    expect(within(bookmarks).getByText("Soon")).toBeTruthy();

    fireEvent.click(within(rail).getByRole("button", { name: "Search transcript" }));
    expect(document.activeElement).toBe(screen.getByRole("searchbox"));
  });

  it("focuses the composer when a line's comments are opened from its badge", async () => {
    renderView(meetingRoutes(() => json(meeting)));
    const badge = await screen.findByRole("button", { name: "1 comment on this line" });
    fireEvent.click(badge);
    const comments = await screen.findByRole("complementary", { name: "Comments" });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(comments).getByRole("textbox", { name: "Add a comment" }),
      ),
    );
  });
});
