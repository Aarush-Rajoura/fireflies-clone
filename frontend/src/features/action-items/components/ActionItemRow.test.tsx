import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/components/ui";
import { PlayerProvider, VirtualClockEngine } from "@/features/player";
import { qk, type ActionItem } from "@/lib/api";

import { updateActionItem } from "../api";
import { ActionItemRow } from "./ActionItemRow";

vi.mock("../api", () => ({
  updateActionItem: vi.fn(() => new Promise(() => {})),
  deleteActionItem: vi.fn(),
  fetchActionItems: vi.fn(() => new Promise(() => {})),
}));

const item: ActionItem = {
  id: 5,
  meeting_id: 1,
  text: "Send the list",
  status: "open",
  source: "ai",
  start_ms: 724_000,
  due_date: null,
  completed_at: null,
  assignee: null,
};

function renderRow(engine = new VirtualClockEngine({ durationMs: 900_000 })) {
  const client = new QueryClient();
  client.setQueryData(qk.actionItems(1), [item]);
  render(
    <QueryClientProvider client={client}>
      <AppProviders>
        <PlayerProvider durationMs={900_000} createEngine={() => engine}>
          <ul>
            <ActionItemRow meetingId={1} item={item} participants={[]} />
          </ul>
        </PlayerProvider>
      </AppProviders>
    </QueryClientProvider>,
  );
  return engine;
}

describe("ActionItemRow", () => {
  it("saves an edit once when Enter is followed by blur", async () => {
    vi.mocked(updateActionItem).mockClear();
    renderRow();
    fireEvent.click(screen.getByRole("button", { name: 'Edit "Send the list"' }));
    const input = screen.getByRole("textbox", { name: "Action item text" });
    fireEvent.change(input, { target: { value: "Send the final list" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input);
    // The request starts after onMutate's async cancel, hence the wait.
    await waitFor(() => expect(updateActionItem).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(updateActionItem).toHaveBeenCalledTimes(1);
    expect(updateActionItem).toHaveBeenCalledWith(5, { text: "Send the final list" });
  });

  it("discards an edit on Escape", () => {
    vi.mocked(updateActionItem).mockClear();
    renderRow();
    fireEvent.click(screen.getByRole("button", { name: 'Edit "Send the list"' }));
    const input = screen.getByRole("textbox", { name: "Action item text" });
    fireEvent.change(input, { target: { value: "nope" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(updateActionItem).not.toHaveBeenCalled();
    expect(screen.getByText("Send the list")).toBeTruthy();
  });

  it("seeks from its timestamp and names delete after the item", () => {
    const engine = new VirtualClockEngine({ durationMs: 900_000 });
    const seek = vi.spyOn(engine, "seek");
    renderRow(engine);
    fireEvent.click(screen.getByRole("button", { name: "Jump to 12:04" }));
    expect(seek).toHaveBeenLastCalledWith(724_000);
    expect(screen.getByRole("button", { name: 'Delete "Send the list"' })).toBeTruthy();
  });
});
