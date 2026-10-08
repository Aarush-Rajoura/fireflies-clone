import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { meeting } from "../testing/fixtures";
import { renderWithClient } from "../testing/render";
import { NotepadHeader } from "./NotepadHeader";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

const noop = () => undefined;

function renderHeader(overrides: Partial<typeof meeting> = {}, onToggleAsk = noop) {
  return renderWithClient(
    <NotepadHeader
      meeting={{ ...meeting, ...overrides }}
      playerVisible
      onTogglePlayer={noop}
      askOpen={false}
      onToggleAsk={onToggleAsk}
      onEdit={noop}
      onMove={noop}
      onDelete={noop}
    />,
  );
}

describe("NotepadHeader", () => {
  it("shows breadcrumb, status, title, attendees, date and duration", () => {
    renderHeader();
    const crumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(crumb.textContent).toContain("# Product");
    expect(crumb.textContent).toContain("Launch Go/No-Go");
    expect(screen.getByText("Ready")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Launch Go/No-Go" })).toBeTruthy();
    expect(screen.getByText("Sarah Watts, +2")).toBeTruthy();
    expect(screen.getByText(/Mar 15, 2026 ·/)).toBeTruthy();
    expect(screen.getByText("20 min")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Player" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("labels media toggle and status from the meeting, falls back to My Meetings without a channel", () => {
    renderHeader({ media_type: "video", has_media: true, status: "live", channel: null });
    expect(screen.getByRole("button", { name: "Video" })).toBeTruthy();
    expect(screen.getByText("Live (demo)")).toBeTruthy();
    expect(screen.getByRole("link", { name: "# My Meetings" })).toBeTruthy();
  });

  it("truncates a long title instead of overflowing, keeping the full text available", () => {
    const long = "Quarterly planning ".repeat(20).trim();
    renderHeader({ title: long });
    const h1 = screen.getByRole("heading", { level: 2 });
    expect(h1.className).toContain("truncate");
    expect(h1.getAttribute("title")).toBe(long);
    // Each text run shrinks inside a min-w-0 flex item; the actions never do.
    expect(h1.parentElement?.className).toContain("min-w-0");
    const crumbTitle = screen
      .getByRole("navigation", { name: "Breadcrumb" })
      .querySelector("[aria-current=page]");
    expect(crumbTitle?.className).toContain("truncate");
    expect(screen.getByRole("group", { name: "Share meeting" }).parentElement?.className).toContain(
      "shrink-0",
    );
  });

  it("shows the meeting's tags with a + Tag control, and an Ask Fred toggle", () => {
    const onToggleAsk = vi.fn();
    renderHeader({ tags: [{ id: 1, name: "Launch", color_index: 0 }] }, onToggleAsk);
    const tags = screen.getByRole("list", { name: "Tags" });
    expect(tags.textContent).toContain("Launch");
    expect(screen.getByRole("button", { name: "Tag" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ask Fred" }));
    expect(onToggleAsk).toHaveBeenCalledTimes(1);
  });
});
