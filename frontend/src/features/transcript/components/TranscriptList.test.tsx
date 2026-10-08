import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { HighlighterProps } from "@/components/ui";
import { PlayerProvider, VirtualClockEngine, usePlayerControls, type PlayerControls } from "@/features/player";

import { installFakePlayerTimers, segments, speakers } from "../testing/fixtures";
import { TranscriptList } from "./TranscriptList";

// Every SegmentRow render renders its Highlighter exactly once, so counting
// Highlighter renders (by line text) counts row renders.
const renders = vi.hoisted(() => new Map<string, number>());
vi.mock("@/components/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui")>();
  return {
    ...actual,
    Highlighter: ({ text }: HighlighterProps) => {
      renders.set(text, (renders.get(text) ?? 0) + 1);
      return <span>{text}</span>;
    },
  };
});

const rowRenders = () => segments.map((s) => renders.get(s.text) ?? 0);

let engine!: VirtualClockEngine;
const player: { controls?: PlayerControls } = {};

function ControlsProbe() {
  const controls = usePlayerControls();
  useEffect(() => {
    player.controls = controls;
  }, [controls]);
  return null;
}
const controls = {
  play: () => player.controls!.play(),
  pause: () => player.controls!.pause(),
  seek: (ms: number) => player.controls!.seek(ms),
};

function renderList() {
  const scrollRef = createRef<HTMLDivElement>();
  const onRename = vi.fn();
  render(
    <PlayerProvider
      durationMs={20_000}
      createEngine={(a) => {
        engine = new VirtualClockEngine(a);
        return engine;
      }}
    >
      <ControlsProbe />
      <TranscriptList segments={segments} speakers={speakers} scrollRef={scrollRef} onRename={onRename} />
    </PlayerProvider>,
  );
  return { scrollRef, onRename };
}

const activeRow = () => document.querySelector("[data-active]")?.getAttribute("data-segment-index");

describe("TranscriptList", () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    installFakePlayerTimers();
    renders.clear();
    scrollIntoView.mockReset();
    Element.prototype.scrollIntoView = scrollIntoView;
  });
  afterEach(() => vi.useRealTimers());

  it("seeks to a line's start_ms on click and keeps the play state", () => {
    renderList();
    const seek = vi.spyOn(engine, "seek");

    act(() => controls.play());
    fireEvent.click(screen.getByText(segments[2]!.text));
    expect(seek).toHaveBeenCalledTimes(1);
    expect(seek).toHaveBeenLastCalledWith(6_000);
    expect(engine.isPlaying).toBe(true);
    expect(activeRow()).toBe("2");

    act(() => controls.pause());
    fireEvent.click(screen.getByText(segments[3]!.text));
    expect(seek).toHaveBeenLastCalledWith(9_000);
    expect(engine.isPlaying).toBe(false);
  });

  it("seeks from the header timestamp, but not from the speaker menu", () => {
    renderList();
    const seek = vi.spyOn(engine, "seek");

    fireEvent.click(screen.getByRole("button", { name: "Play from 00:06" }));
    expect(seek).toHaveBeenCalledTimes(1);
    expect(seek).toHaveBeenLastCalledWith(6_000);

    fireEvent.click(screen.getAllByRole("button", { name: "Janice" })[0]!);
    expect(seek).toHaveBeenCalledTimes(1);
  });

  it("shows the speaker header only when the speaker changes", () => {
    renderList();
    // Lines 1+2 are Sarah's, then Janice, Sarah, Janice: four headers for five lines.
    expect(screen.getAllByRole("button", { name: /^(Sarah Watts|Janice)$/ })).toHaveLength(4);
  });

  it("re-renders only the rows whose active state changed as the clock advances", () => {
    renderList();
    expect(activeRow()).toBe("0");
    renders.clear();

    act(() => controls.play());
    // ~2.5s of ticks inside line 0: no row changes.
    for (let i = 0; i < 25; i++) act(() => vi.advanceTimersByTime(100));
    expect(rowRenders()).toEqual([0, 0, 0, 0, 0]);

    // Crossing 3s moves the highlight from line 0 to line 1: exactly those two re-render.
    for (let i = 0; i < 10; i++) act(() => vi.advanceTimersByTime(100));
    expect(activeRow()).toBe("1");
    expect(rowRenders()).toEqual([1, 1, 0, 0, 0]);

    renders.clear();
    act(() => controls.seek(12_500));
    expect(activeRow()).toBe("4");
    expect(rowRenders()).toEqual([0, 1, 0, 0, 1]);
  });

  /** A 200px viewport with 50px rows every 60px: rows 0-2 on screen, 3+ below. Row 0 hugs the top edge. */
  function stubLayout() {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      const index = this.getAttribute("data-segment-index");
      const top = index === null ? 0 : Number(index) * 60;
      const height = index === null ? 200 : 50;
      return { top, bottom: top + height, left: 0, right: 300, width: 300, height, x: 0, y: top } as DOMRect;
    });
  }
  const scrolledRows = () =>
    scrollIntoView.mock.contexts.map((el) => (el as Element).getAttribute("data-segment-index"));

  it("while playing, scrolls only when the active line leaves the comfortable middle", () => {
    stubLayout();
    renderList();
    act(() => controls.play());
    // Starting playback brings row 0 (hugging the top edge) to the middle; not under test here.
    scrollIntoView.mockClear();
    act(() => controls.seek(3_000)); // row 1, mid-viewport
    expect(scrollIntoView).not.toHaveBeenCalled();
    act(() => controls.seek(12_000)); // row 4, off-screen
    expect(scrolledRows()).toEqual(["4"]);
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: "smooth", block: "center" });
  });

  it("never re-centres a line the user clicked, but keeps following afterwards", () => {
    stubLayout();
    renderList();
    act(() => controls.play());
    // Starting playback brings row 0 (hugging the top edge) to the middle; not under test here.
    scrollIntoView.mockClear();
    // Row 3 is near the bottom edge, so a follow-scroll would normally move it.
    fireEvent.click(screen.getByText(segments[3]!.text));
    expect(activeRow()).toBe("3");
    expect(scrollIntoView).not.toHaveBeenCalled();

    // Playback carrying on into row 4 (off-screen) is followed again.
    for (let i = 0; i < 32; i++) act(() => vi.advanceTimersByTime(100));
    expect(activeRow()).toBe("4");
    expect(scrolledRows()).toEqual(["4"]);
  });

  it("pauses on manual scroll and resumes from the pill", () => {
    stubLayout();
    const { scrollRef } = renderList();
    act(() => controls.play());
    // Starting playback brings row 0 (hugging the top edge) to the middle; not under test here.
    scrollIntoView.mockClear();

    fireEvent.wheel(scrollRef.current!);
    const pill = screen.getByRole("button", { name: "Jump to current" });
    act(() => controls.seek(12_000));
    expect(scrollIntoView).not.toHaveBeenCalled();

    fireEvent.click(pill);
    expect(scrolledRows()).toEqual(["4"]);
    expect(screen.queryByRole("button", { name: "Jump to current" })).toBeNull();
  });

  it("treats scroll keys pressed on a focused timestamp button as manual scrolling", () => {
    renderList();
    const stamp = screen.getByRole("button", { name: "Play from 00:06" });
    stamp.focus();
    fireEvent.keyDown(stamp, { key: "PageDown" });
    expect(screen.getByRole("button", { name: "Jump to current" })).toBeTruthy();
  });
});
