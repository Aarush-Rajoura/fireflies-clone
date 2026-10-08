import { useQuery } from "@tanstack/react-query";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getToasts, resetToasts } from "@/components/ui/toast-store";
import { ApiError, qk, type MeetingDetail, type Page, type Tag } from "@/lib/api";

import { createTag, listTags, setMeetingTags } from "../api";
import { meetingFixture, renderWithClient } from "../testing/fixtures";
import { MeetingTags } from "./MeetingTags";

vi.mock("../api", () => ({
  listTags: vi.fn(),
  createTag: vi.fn(),
  setMeetingTags: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
}));

const launch: Tag = { id: 1, name: "Launch", color_index: 0 };
const hiring: Tag = { id: 2, name: "Hiring", color_index: 0 };
const page = (items: Tag[]): Page<Tag> => ({
  items,
  page: 1,
  page_size: 100,
  total: items.length,
  total_pages: 1,
  has_next: false,
});

/** Reads the meeting from the cache, as the real page does, so optimistic edits show. */
function Harness({ initial }: { initial: MeetingDetail }) {
  const { data } = useQuery<MeetingDetail>({
    queryKey: qk.meetings.detail(7),
    queryFn: () => new Promise(() => {}),
    initialData: initial,
    staleTime: Infinity,
  });
  return data ? <MeetingTags meeting={data} /> : null;
}

function setup(meeting: Partial<MeetingDetail> = {}) {
  vi.mocked(listTags).mockResolvedValue(page([launch, hiring]));
  const view = renderWithClient(
    <Harness initial={meetingFixture({ tags: [launch], ...meeting })} />,
  );
  const shownTags = () =>
    within(screen.getByRole("list", { name: "Tags" }))
      .getAllByRole("listitem")
      .map((li) => li.textContent)
      .filter((t) => t !== "Tag");
  const open = async () => {
    fireEvent.click(screen.getByRole("button", { name: "Tag" }));
    await screen.findByRole("checkbox", { name: "Hiring" });
  };
  return { ...view, shownTags, open };
}

describe("TagEditor", () => {
  afterEach(() => resetToasts());

  it("toggles a tag on optimistically and sends the whole set", async () => {
    vi.mocked(setMeetingTags).mockReturnValue(new Promise(() => {}));
    const { shownTags, open } = setup();
    await open();

    expect(screen.getByRole("checkbox", { name: "Launch" }).getAttribute("data-state")).toBe(
      "checked",
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Hiring" }));

    await waitFor(() => expect(shownTags()).toEqual(["Launch", "Hiring"]));
    expect(setMeetingTags).toHaveBeenCalledWith(7, [1, 2]);
  });

  it("rolls the chips back and toasts when the server refuses", async () => {
    let reject!: (e: unknown) => void;
    vi.mocked(setMeetingTags).mockReturnValue(new Promise((_, r) => (reject = r)));
    const { shownTags, open } = setup();
    await open();

    fireEvent.click(screen.getByRole("checkbox", { name: "Launch" }));
    await waitFor(() => expect(shownTags()).toEqual([]));

    await act(async () => reject(new ApiError("TAG_NOT_FOUND", 422, "That tag is gone")));
    await waitFor(() => expect(shownTags()).toEqual(["Launch"]));
    expect(getToasts().map((t) => [t.kind, t.message])).toEqual([["error", "That tag is gone"]]);
  });

  it("creates a new tag from the search box and applies it", async () => {
    const budget: Tag = { id: 3, name: "Budget", color_index: 4 };
    vi.mocked(createTag).mockResolvedValue(budget);
    vi.mocked(setMeetingTags).mockReturnValue(new Promise(() => {}));
    const { shownTags, open } = setup();
    await open();

    fireEvent.change(screen.getByRole("textbox", { name: "Search or create a tag" }), {
      target: { value: "  Budget " },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create “Budget”/ }));

    await waitFor(() => expect(setMeetingTags).toHaveBeenCalledWith(7, [1, 3]));
    expect(vi.mocked(createTag).mock.calls[0]![0]).toMatchObject({ name: "Budget" });
    await waitFor(() => expect(shownTags()).toEqual(["Launch", "Budget"]));
  });

  it("reuses an existing tag on Enter instead of creating a duplicate, ignoring case", async () => {
    vi.mocked(setMeetingTags).mockReturnValue(new Promise(() => {}));
    const { open } = setup();
    await open();

    const input = screen.getByRole("textbox", { name: "Search or create a tag" });
    fireEvent.change(input, { target: { value: "hiring" } });
    expect(screen.queryByRole("button", { name: /Create/ })).toBeNull();
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(setMeetingTags).toHaveBeenCalledWith(7, [1, 2]));
    expect(createTag).not.toHaveBeenCalled();
  });

  it("never removes a tag on Enter, even when the query names an applied one", async () => {
    const { shownTags, open } = setup();
    await open();

    const input = screen.getByRole("textbox", { name: "Search or create a tag" });
    fireEvent.change(input, { target: { value: "LAUNCH" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(setMeetingTags).not.toHaveBeenCalled();
    expect(shownTags()).toEqual(["Launch"]);
  });

  it("keeps the query, with a spinning Create, until the new tag is applied", async () => {
    let resolve!: (t: Tag) => void;
    vi.mocked(createTag).mockReturnValue(new Promise((r) => (resolve = r)));
    vi.mocked(setMeetingTags).mockReturnValue(new Promise(() => {}));
    const { open } = setup();
    await open();

    const input = screen.getByRole("textbox", {
      name: "Search or create a tag",
    }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Budget" } });
    fireEvent.keyDown(input, { key: "Enter" });

    const create = await screen.findByRole("button", { name: /Create “Budget”/ });
    await waitFor(() => expect(create.getAttribute("aria-busy")).toBe("true"));
    expect(input.value).toBe("Budget");

    await act(async () => resolve({ id: 3, name: "Budget", color_index: 4 }));
    await waitFor(() => expect(input.value).toBe(""));
    expect(setMeetingTags).toHaveBeenCalledWith(7, [1, 3]);
  });

  it("applies a suggested keyword, falling back to the existing tag on 409", async () => {
    const roadmap: Tag = { id: 9, name: "Roadmap", color_index: 0 };
    vi.mocked(createTag).mockRejectedValue(new ApiError("TAG_EXISTS", 409, "exists"));
    vi.mocked(setMeetingTags).mockReturnValue(new Promise(() => {}));
    const { open } = setup({ suggested_tags: ["roadmap"] });
    await open();

    // Someone else created it meanwhile: the refetch finds it.
    vi.mocked(listTags).mockResolvedValue(page([launch, hiring, roadmap]));
    fireEvent.click(screen.getByRole("button", { name: "Add suggested tag roadmap" }));

    await waitFor(() => expect(setMeetingTags).toHaveBeenCalledWith(7, [1, 9]));
    expect(getToasts()).toEqual([]);
  });
});
