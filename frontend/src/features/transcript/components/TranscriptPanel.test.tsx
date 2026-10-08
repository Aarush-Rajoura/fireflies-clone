import { QueryClientProvider } from "@tanstack/react-query";
import { act, createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui";
import { PlayerProvider, VirtualClockEngine } from "@/features/player";
import { makeQueryClient } from "@/lib/query/query-client";

import { transcript } from "../testing/fixtures";
import { TranscriptPanel } from "./TranscriptPanel";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

type Route = (req: Request) => Promise<Response> | Response;

let engine!: VirtualClockEngine;
const notify = vi.fn();

function renderPanel(route: Route) {
  vi.stubGlobal("fetch", vi.fn<(req: Request) => Promise<Response>>(async (req) => route(req)));
  const client = makeQueryClient(notify);
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <PlayerProvider
          durationMs={20_000}
          createEngine={(a) => {
            engine = new VirtualClockEngine(a);
            return engine;
          }}
        >
          <TranscriptPanel meetingId={7} />
        </PlayerProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

const transcriptOk: Route = (req) =>
  req.method === "GET" ? json(transcript) : json({ error: { code: "X", message: "nope" } }, 500);

describe("TranscriptPanel", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    notify.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows skeleton rows while loading, then the lines", async () => {
    renderPanel(transcriptOk);
    expect(screen.getByRole("status", { name: "Loading transcript" })).toBeTruthy();
    expect(await screen.findByText(transcript.segments[0]!.text)).toBeTruthy();
    expect(new URL((vi.mocked(fetch).mock.calls[0]![0] as Request).url).pathname).toBe(
      "/api/v1/meetings/7/transcript",
    );
  });

  it("shows an empty state for a transcript with no lines", async () => {
    renderPanel(() => json({ speakers: [], segments: [] }));
    expect(await screen.findByText("No transcript yet")).toBeTruthy();
  });

  it("renders nothing for a deleted meeting, leaving that state to the page", async () => {
    const { container } = renderPanel(() =>
      json({ error: { code: "MEETING_DELETED", message: "Meeting was deleted", details: {} } }, 410),
    );
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("status", { name: "Loading transcript" })).toBeNull());
    expect(container.textContent).toBe("");
  });

  it("seeks exactly once per chosen match, from the event handler", async () => {
    renderPanel(transcriptOk);
    await screen.findByText(transcript.segments[0]!.text);
    const seek = vi.spyOn(engine, "seek");
    const input = screen.getByRole("searchbox", { name: "Search transcript" });

    fireEvent.change(input, { target: { value: "PRICING" } });
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("2 results"));
    // Typing highlights, it never moves the player.
    expect(seek).not.toHaveBeenCalled();
    expect(document.querySelectorAll("mark")).toHaveLength(2);

    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("status").textContent).toBe("1 of 2");
    expect(seek).toHaveBeenCalledTimes(1);
    expect(seek).toHaveBeenLastCalledWith(3_000);
    expect(document.querySelector('mark[aria-current="true"]')?.textContent).toBe("pricing");

    fireEvent.keyDown(input, { key: "Enter" });
    expect(seek).toHaveBeenCalledTimes(2);
    expect(seek).toHaveBeenLastCalledWith(12_000);

    // Playback moving on afterwards must not drag the player back to the match.
    act(() => engine.seek(15_000));
    await act(async () => {});
    expect(seek).toHaveBeenCalledTimes(3);
    expect(seek).toHaveBeenLastCalledWith(15_000);

    fireEvent.keyDown(input, { key: "Escape" });
    expect((input as HTMLInputElement).value).toBe("");
    expect(document.querySelectorAll("mark")).toHaveLength(0);
  });

  it("choosing a match resumes auto-follow, hiding the Jump to current pill", async () => {
    renderPanel(transcriptOk);
    await screen.findByText(transcript.segments[0]!.text);
    fireEvent.wheel(screen.getByLabelText("Transcript lines"));
    expect(screen.getByRole("button", { name: "Jump to current" })).toBeTruthy();

    const input = screen.getByRole("searchbox", { name: "Search transcript" });
    fireEvent.change(input, { target: { value: "pricing" } });
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("2 results"));
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.queryByRole("button", { name: "Jump to current" })).toBeNull();
  });

  it("focuses the search on Ctrl/Cmd+F from inside the panel", async () => {
    renderPanel(transcriptOk);
    await screen.findByText(transcript.segments[0]!.text);
    const list = screen.getByLabelText("Transcript lines");
    list.focus();
    fireEvent.keyDown(list, { key: "f", ctrlKey: true });
    expect(document.activeElement).toBe(screen.getByRole("searchbox", { name: "Search transcript" }));
  });

  it("leaves Ctrl/Cmd+F alone inside the portalled rename dialog", async () => {
    renderPanel(transcriptOk);
    await screen.findByText(transcript.segments[0]!.text);
    fireEvent.keyDown(screen.getAllByRole("button", { name: "Janice" })[0]!, { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Rename speaker" }));
    const field = within(await screen.findByRole("dialog")).getByLabelText("Speaker name");
    field.focus();
    const event = createEvent.keyDown(field, { key: "f", ctrlKey: true });
    fireEvent(field, event);
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(field);
  });

  it("renames a speaker optimistically and rolls back with a toast on failure", async () => {
    let fail!: () => void;
    renderPanel((req) => {
      if (req.method === "GET") return json(transcript);
      return new Promise<Response>((resolve) => {
        fail = () => resolve(json({ error: { code: "BAD", message: "Rename failed" } }, 422));
      });
    });
    await screen.findByText(transcript.segments[0]!.text);

    const trigger = screen.getAllByRole("button", { name: "Janice" })[0]!;
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Rename speaker" }));

    const dialog = await screen.findByRole("dialog", { name: "Rename speaker" });
    const field = within(dialog).getByLabelText("Speaker name");
    fireEvent.change(field, { target: { value: "Janice Lee" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getAllByRole("button", { name: "Janice Lee" })).toHaveLength(2));
    const patch = vi.mocked(fetch).mock.calls.map(([r]) => r as Request).find((r) => r.method === "PATCH")!;
    expect(new URL(patch.url).pathname).toBe("/api/v1/speakers/2");
    expect(await patch.clone().json()).toEqual({ name: "Janice Lee" });

    await act(async () => fail());
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Janice" })).toHaveLength(2));
    expect(notify).toHaveBeenCalledWith("Rename failed", undefined);
  });
});
