import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PlayerProvider, VirtualClockEngine } from "@/features/player";

import { buildChapters } from "../lib/chapters";
import { OutlineSection } from "./OutlineSection";

describe("OutlineSection", () => {
  it("seeks the player to an outline entry's start", () => {
    const engine = new VirtualClockEngine({ durationMs: 900_000 });
    const seek = vi.spyOn(engine, "seek");
    const chapters = buildChapters(
      [
        { title: "Intro", start_ms: 0 },
        { title: "Pricing", start_ms: 612_000 },
        { title: "Loose ends", start_ms: null },
      ],
      900_000,
    );

    render(
      <PlayerProvider durationMs={900_000} createEngine={() => engine}>
        <OutlineSection label="Meeting Outline" chapters={chapters} />
      </PlayerProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Jump to Pricing at 10:12" }));
    expect(seek).toHaveBeenLastCalledWith(612_000);
    // Unanchored entries render as text, not a dead button.
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByText("Loose ends")).toBeTruthy();
  });
});
