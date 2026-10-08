import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { searchTranscripts } from "../api";
import { hit, page } from "../testing/fixtures";
import { SearchDropdown, stepIndex } from "./SearchDropdown";

const push = vi.fn();
const nav = { pathname: "/meetings", params: new URLSearchParams() };
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => nav.pathname,
  useSearchParams: () => nav.params,
}));
vi.mock("../api", () => ({ searchTranscripts: vi.fn() }));

const HITS = [
  hit({ meeting_id: 1, meeting_title: "Launch sync", segment_id: 11, start_ms: 65_000 }),
  hit({ meeting_id: 2, meeting_title: "Pricing review", segment_id: 21, start_ms: 3_000 }),
  hit({ meeting_id: 1, meeting_title: "Launch sync", segment_id: 12, start_ms: 120_500 }),
];

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SearchDropdown />
    </QueryClientProvider>,
  );
  return screen.getByRole("combobox", { name: "Search meetings" });
}

async function typeAndWait(input: HTMLElement, text: string) {
  input.focus();
  fireEvent.change(input, { target: { value: text } });
  await screen.findAllByText("Launch sync");
}

const activeOption = (input: HTMLElement) => {
  const id = input.getAttribute("aria-activedescendant");
  return id ? document.getElementById(id) : null;
};

describe("stepIndex", () => {
  it("wraps in both directions and starts from the edge when nothing is active", () => {
    expect(stepIndex(-1, 4, 1)).toBe(0);
    expect(stepIndex(-1, 4, -1)).toBe(3);
    expect(stepIndex(3, 4, 1)).toBe(0);
    expect(stepIndex(0, 4, -1)).toBe(3);
    expect(stepIndex(-1, 0, 1)).toBe(-1);
  });
});

describe("SearchDropdown", () => {
  beforeEach(() => {
    push.mockReset();
    nav.pathname = "/meetings";
    nav.params = new URLSearchParams();
    vi.mocked(searchTranscripts).mockReset().mockResolvedValue(page(HITS));
  });

  it("asks for the top 5 hits and shows them grouped by meeting", async () => {
    const input = setup();
    await typeAndWait(input, " launch ");
    expect(searchTranscripts).toHaveBeenCalledWith(
      { q: "launch", page: 1, page_size: 5 },
      expect.anything(),
    );
    const groups = screen.getAllByRole("group");
    expect(groups.map((g) => g.getAttribute("aria-label"))).toEqual([
      "Launch sync",
      "Pricing review",
    ]);
    // Both Launch hits sit under one heading, then "See all results".
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(4);
    expect(options[3]?.textContent).toContain("See all results for “launch”");
    expect(input.getAttribute("aria-expanded")).toBe("true");
  });

  it("moves through the options with ↑/↓ and opens the active hit with Enter", async () => {
    const input = setup();
    await typeAndWait(input, "launch");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(activeOption(input)?.textContent).toContain("01:05");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(activeOption(input)?.textContent).toContain("02:00");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(activeOption(input)?.textContent).toContain("00:03");
    expect(activeOption(input)?.getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/meetings/2?t=3");
  });

  it("wraps from the first option up to “See all results”", async () => {
    const input = setup();
    await typeAndWait(input, "launch");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(activeOption(input)?.textContent).toContain("See all results");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/search?q=launch");
  });

  it("opens the full results on Enter with no active option", async () => {
    const input = setup();
    await typeAndWait(input, "launch");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/search?q=launch");
  });

  it("closes on Esc but keeps the text; a second Esc clears it", async () => {
    const input = setup() as HTMLInputElement;
    await typeAndWait(input, "launch");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input.value).toBe("launch");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("");
  });

  it("opens a hit on click", async () => {
    const input = setup();
    await typeAndWait(input, "launch");
    fireEvent.click(screen.getAllByRole("option")[1] as HTMLElement);
    expect(push).toHaveBeenCalledWith("/meetings/1?t=120.5");
  });

  it("says so when nothing matches", async () => {
    vi.mocked(searchTranscripts).mockResolvedValue(page([]));
    const input = setup();
    input.focus();
    fireEvent.change(input, { target: { value: "zebra" } });
    await waitFor(() =>
      expect(screen.getByText("No transcript matches for “zebra”.")).toBeTruthy(),
    );
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });

  it("never searches a blank query", async () => {
    const input = setup();
    input.focus();
    fireEvent.change(input, { target: { value: "   " } });
    await new Promise((r) => setTimeout(r, 300));
    expect(searchTranscripts).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("keeps older hits visible but unselectable while the new query settles", async () => {
    const input = setup();
    await typeAndWait(input, "launch");
    // The next query never resolves, so the old hits stay as placeholder data.
    vi.mocked(searchTranscripts).mockReturnValue(new Promise(() => undefined));
    fireEvent.change(input, { target: { value: "launch plan" } });

    expect(screen.getAllByText("Launch sync").length).toBeGreaterThan(0);
    expect(screen.getByRole("status", { name: "Searching" })).toBeTruthy();
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]?.textContent).toContain("See all results for “launch plan”");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(activeOption(input)?.textContent).toContain("See all results");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/search?q=launch%20plan");

    // Still stale once the debounce has fired and the request is in flight.
    await waitFor(() => expect(searchTranscripts).toHaveBeenCalledTimes(2));
    expect(screen.queryAllByRole("option").length).toBeLessThanOrEqual(1);
  });

  it("mirrors ?q into the field on the search page", () => {
    nav.pathname = "/search";
    nav.params = new URLSearchParams({ q: "pricing" });
    const input = setup() as HTMLInputElement;
    expect(input.value).toBe("pricing");
  });

  it("leaves the field alone elsewhere", () => {
    nav.params = new URLSearchParams({ q: "pricing" });
    const input = setup() as HTMLInputElement;
    expect(input.value).toBe("");
  });

  describe("shortcut hint", () => {
    afterEach(() => vi.restoreAllMocks());

    it("shows ⌘ on macOS", () => {
      vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
      setup();
      expect(screen.getByText("⌘")).toBeTruthy();
    });

    it("shows Ctrl elsewhere", () => {
      vi.spyOn(navigator, "platform", "get").mockReturnValue("Win32");
      setup();
      expect(screen.getByText("Ctrl")).toBeTruthy();
    });
  });
});
