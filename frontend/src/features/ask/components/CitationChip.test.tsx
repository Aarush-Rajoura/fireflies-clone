import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { PlayerProvider, VirtualClockEngine } from "@/features/player";
import type { AskCitation } from "@/lib/api";

import { ask } from "../api";
import { AskPanel } from "./AskPanel";
import { CitationChip, citationHref } from "./CitationChip";

vi.mock("../api", () => ({ ask: vi.fn() }));

const citation: AskCitation = {
  segment_id: 41,
  start_ms: 754_500,
  quote: "We launch on March 30",
  meeting_id: 7,
  meeting_title: "Launch Go/No-Go",
};

let engine!: VirtualClockEngine;

function renderInPlayer(ui: ReactNode) {
  return render(
    <PlayerProvider
      durationMs={20 * 60_000}
      createEngine={(args) => {
        engine = new VirtualClockEngine(args);
        return engine;
      }}
    >
      {ui}
    </PlayerProvider>,
  );
}

describe("CitationChip", () => {
  it("seeks this page's player to the cited line", () => {
    renderInPlayer(<CitationChip citation={citation} mode="seek" />);
    const seek = vi.spyOn(engine, "seek");
    fireEvent.click(screen.getByRole("button", { name: /Jump to 12:34/ }));
    expect(seek).toHaveBeenCalledWith(754_500);
  });

  it("links to the meeting with ?t= in seconds, not milliseconds", () => {
    render(<CitationChip citation={citation} mode="link" />);
    const link = screen.getByRole("link", { name: /Launch Go\/No-Go at 12:34/ });
    expect(link.getAttribute("href")).toBe("/meetings/7?t=754.5");
    expect(citationHref({ meeting_id: 3, start_ms: 60_000 })).toBe("/meetings/3?t=60");
  });
});

describe("AskPanel in a meeting", () => {
  it("sends on Enter (not Shift+Enter) and its answer's citations seek the player", async () => {
    vi.mocked(ask).mockResolvedValue({
      answer: "March 30.",
      citations: [citation],
      provider: "fake",
      model: null,
    });
    renderInPlayer(<AskPanel scope={{ meetingId: 7 }} greeting={<p>Hi</p>} />);
    const box = screen.getByRole("textbox", { name: "Ask Fred a question" });

    fireEvent.change(box, { target: { value: "When is the launch?" } });
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(ask).not.toHaveBeenCalled();
    await act(async () => void fireEvent.keyDown(box, { key: "Enter" }));
    expect(ask).toHaveBeenCalledWith({ meetingId: 7 }, "When is the launch?");
    expect((box as HTMLTextAreaElement).value).toBe("");

    const jump = await screen.findByRole("button", { name: /Jump to 12:34/ });
    const seek = vi.spyOn(engine, "seek");
    fireEvent.click(jump);
    expect(seek).toHaveBeenCalledWith(754_500);
  });

  it("sends a suggested question in one tap", async () => {
    vi.mocked(ask).mockReturnValue(new Promise(() => {}));
    renderInPlayer(
      <AskPanel
        scope={{ meetingId: 7 }}
        greeting={<p>Hi</p>}
        suggestions={[{ label: "Key decisions", question: "What were the key decisions?" }]}
      />,
    );
    await act(
      async () => void fireEvent.click(screen.getByRole("button", { name: "Key decisions" })),
    );
    expect(ask).toHaveBeenCalledWith({ meetingId: 7 }, "What were the key decisions?");
    expect(screen.getByText("Fred is thinking…")).toBeTruthy();
  });
});
