import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/components/ui";

import { searchTranscripts } from "../api";
import { hit, page } from "../testing/fixtures";
import { SearchResultsPage } from "./SearchResultsPage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../api", () => ({ searchTranscripts: vi.fn() }));

function renderPage(q: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AppProviders>
        <SearchResultsPage q={q} />
      </AppProviders>
    </QueryClientProvider>,
  );
}

describe("SearchResultsPage", () => {
  beforeEach(() => vi.mocked(searchTranscripts).mockReset());

  it("groups hits by meeting, highlights matches and deep-links each hit", async () => {
    vi.mocked(searchTranscripts).mockResolvedValue(
      page([
        hit({ meeting_id: 4, meeting_title: "Pricing review", segment_id: 1, start_ms: 90_000 }),
        hit({ meeting_id: 7, meeting_title: "Board prep", segment_id: 2 }),
        hit({ meeting_id: 4, meeting_title: "Pricing review", segment_id: 3, start_ms: 5_000 }),
      ]),
    );
    renderPage("pricing");

    const pricing = await screen.findByRole("region", { name: "Pricing review" });
    expect(screen.getByText("3 matches for “pricing”")).toBeTruthy();
    expect(within(pricing).getByText("2 matches")).toBeTruthy();
    const links = within(pricing)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(links).toEqual(["/meetings/4", "/meetings/4?t=90", "/meetings/4?t=5"]);
    expect(within(pricing).getAllByText("launch")[0]?.tagName).toBe("MARK");

    const regions = screen.getAllByRole("region").map((r) => r.getAttribute("aria-labelledby"));
    expect(regions).toEqual(["search-meeting-4", "search-meeting-7"]);
  });

  it("shows the empty state when nothing matches", async () => {
    vi.mocked(searchTranscripts).mockResolvedValue(page([]));
    renderPage("zebra");
    expect(await screen.findByText("No results for “zebra”")).toBeTruthy();
  });

  it("prompts for a query without calling the API", () => {
    renderPage("");
    expect(screen.getByText("Search across all meetings")).toBeTruthy();
    expect(searchTranscripts).not.toHaveBeenCalled();
  });
});
