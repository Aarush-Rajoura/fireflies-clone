import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/components/ui";
import { qk, type Highlight } from "@/lib/api";

import { createHighlight } from "../api";
import { SelectionToolbar } from "./SelectionToolbar";

vi.mock("../api", () => ({
  createHighlight: vi.fn(() => new Promise(() => {})),
  fetchHighlights: vi.fn(() => new Promise(() => {})),
}));

const onComment = vi.fn();
const onCreateSoundbite = vi.fn();

function Harness() {
  const scope = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={scope}>
        <p data-segment-text="101">
          <span>Let&apos;s start with pricing for Acme.</span>
        </p>
        <p data-segment-text="102">
          <span>Pricing looks fine to us.</span>
        </p>
      </div>
      <SelectionToolbar
        meetingId={1}
        scopeRef={scope}
        onComment={onComment}
        onCreateSoundbite={onCreateSoundbite}
      />
    </>
  );
}

function setup() {
  const client = new QueryClient();
  client.setQueryData(qk.highlights(1), []);
  render(
    <QueryClientProvider client={client}>
      <AppProviders>
        <Harness />
      </AppProviders>
    </QueryClientProvider>,
  );
  return client;
}

const textOf = (id: number) =>
  document.querySelector(`[data-segment-text="${id}"] span`)!.firstChild as Text;

/** Select like a user would, then release the mouse. */
async function select(start: [Text, number], end: [Text, number]) {
  const range = document.createRange();
  range.setStart(...start);
  range.setEnd(...end);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  await act(async () => {
    fireEvent.pointerUp(document);
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe("SelectionToolbar", () => {
  afterEach(() => {
    window.getSelection()?.removeAllRanges();
    vi.clearAllMocks();
  });

  it("highlights the selected words with their string offsets", async () => {
    const client = setup();
    const node = textOf(101);
    const at = node.data.indexOf("pricing");
    await select([node, at], [node, at + 7]);

    const toolbar = screen.getByRole("toolbar", { name: "Annotate selection" });
    fireEvent.click(screen.getByRole("button", { name: "Highlight green" }));

    // Optimistic: the highlight is in the cache before the server answers.
    await waitFor(() =>
      expect(client.getQueryData<Highlight[]>(qk.highlights(1))).toMatchObject([
        { segment_id: 101, start_offset: at, end_offset: at + 7, color: "green" },
      ]),
    );
    await waitFor(() =>
      expect(createHighlight).toHaveBeenCalledWith(1, {
        segment_id: 101,
        start_offset: at,
        end_offset: at + 7,
        color: "green",
      }),
    );
    expect(toolbar.isConnected).toBe(false);
    expect(window.getSelection()?.isCollapsed).toBe(true);
  });

  it("hands Comment and Create soundbite the resolved selection", async () => {
    setup();
    const node = textOf(102);
    await select([node, 0], [node, 7]);
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    expect(onComment).toHaveBeenCalledWith(
      expect.objectContaining({ segmentId: 102, start: 0, end: 7, text: "Pricing" }),
    );

    await select([node, 8], [node, 13]);
    fireEvent.click(screen.getByRole("button", { name: "Create soundbite" }));
    expect(onCreateSoundbite).toHaveBeenCalledWith(
      expect.objectContaining({ segmentId: 102, text: "looks" }),
    );
  });

  it("explains instead of acting when the selection spans two lines", async () => {
    setup();
    await select([textOf(101), 10], [textOf(102), 7]);
    expect(screen.queryByRole("toolbar", { name: "Annotate selection" })).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("within a single line");
    expect(screen.queryByRole("button", { name: "Highlight green" })).toBeNull();
  });

  it("disappears when the selection collapses", async () => {
    setup();
    const node = textOf(101);
    await select([node, 0], [node, 5]);
    expect(screen.getByRole("toolbar", { name: "Annotate selection" })).toBeTruthy();
    await act(async () => {
      window.getSelection()!.collapse(node, 2);
      document.dispatchEvent(new Event("selectionchange"));
    });
    expect(screen.queryByRole("toolbar")).toBeNull();
  });
});
