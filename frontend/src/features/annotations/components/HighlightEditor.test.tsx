import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/components/ui";
import { qk, type Highlight } from "@/lib/api";

import { deleteHighlight, updateHighlight } from "../api";
import { HighlightEditor } from "./HighlightEditor";

vi.mock("../api", () => ({
  updateHighlight: vi.fn(() => new Promise(() => {})),
  deleteHighlight: vi.fn(() => new Promise(() => {})),
  fetchHighlights: vi.fn(() => new Promise(() => {})),
}));

const saved: Highlight = {
  id: 4,
  meeting_id: 1,
  segment_id: 101,
  start_offset: 0,
  end_offset: 7,
  color: "yellow",
  created_by: 3,
};

function setup() {
  const client = new QueryClient();
  client.setQueryData(qk.highlights(1), [saved]);
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <AppProviders>
        <HighlightEditor
          meetingId={1}
          target={{ id: 4, anchor: { top: 100, bottom: 120, left: 50, right: 90 } }}
          onClose={onClose}
          onReposition={vi.fn()}
        />
      </AppProviders>
    </QueryClientProvider>,
  );
  const list = () => client.getQueryData<Highlight[]>(qk.highlights(1));
  return { onClose, list };
}

describe("HighlightEditor", () => {
  afterEach(() => vi.clearAllMocks());

  it("recolours optimistically and closes", async () => {
    const { onClose, list } = setup();
    expect(
      screen.getByRole("button", { name: "Highlight yellow" }).getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Highlight purple" }));
    expect(onClose).toHaveBeenCalled();
    await waitFor(() => expect(list()?.[0]?.color).toBe("purple"));
    await waitFor(() => expect(updateHighlight).toHaveBeenCalledWith(4, { color: "purple" }));
  });

  it("removes optimistically", async () => {
    const { list } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Remove highlight" }));
    await waitFor(() => expect(list()).toEqual([]));
    await waitFor(() => expect(deleteHighlight).toHaveBeenCalledWith(4));
  });

  it("closes on Escape and on a press elsewhere", () => {
    const { onClose } = setup();
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
