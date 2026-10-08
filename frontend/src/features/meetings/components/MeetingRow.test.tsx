import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/components/ui";

import { meetingFixture } from "../testing/fixtures";

import { MeetingRow } from "./MeetingRow";

const renderRow = (overrides: Parameters<typeof meetingFixture>[0] = {}) =>
  render(
    <AppProviders>
      <MeetingRow
        meeting={meetingFixture(overrides)}
        channels={[{ id: 9, name: "product" }]}
        onOpen={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
        timeZone="UTC"
      />
    </AppProviders>,
  );

describe("MeetingRow", () => {
  it("links the title and shows the meta line", () => {
    renderRow();
    const link = screen.getByRole("link", { name: "Weekly product sync" });
    expect(link.getAttribute("href")).toBe("/meetings/1");
    expect(screen.getByText("Oct 7 · 9:00 AM · 32 min · Ada Lovelace")).toBeTruthy();
  });

  it("shows three participant avatars plus the rest as a count", () => {
    const { container } = renderRow();
    const avatars = within(container).getAllByRole("img");
    expect(avatars.map((a) => a.getAttribute("aria-label"))).toEqual([
      "Ada Lovelace",
      "Grace Hopper",
      "Alan Turing",
    ]);
    // 7 participants, 3 drawn.
    expect(screen.getByText("+4")).toBeTruthy();
  });

  it("badges open action items, at most three keywords and the channel", () => {
    renderRow();
    expect(screen.getByLabelText("3 open action items").textContent).toBe("3");
    expect(screen.getByText("roadmap")).toBeTruthy();
    expect(screen.getByText("hiring")).toBeTruthy();
    expect(screen.queryByText("launch")).toBeNull();
    expect(screen.getByText("product")).toBeTruthy();
  });

  it("omits the badge when nothing is open", () => {
    renderRow({ action_item_counts: { open: 0, completed: 2 }, channel: null, channel_id: null });
    expect(screen.queryByLabelText(/open action/)).toBeNull();
    expect(screen.queryByText("product")).toBeNull();
  });

  it("offers a labelled actions menu", () => {
    renderRow();
    expect(screen.getByRole("button", { name: "Actions for Weekly product sync" })).toBeTruthy();
  });
});
