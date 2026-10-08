import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { errorJson, json, meeting, routeFetch, type Route } from "../testing/fixtures";
import { renderWithClient } from "../testing/render";
import { EditMeetingModal } from "./EditMeetingModal";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

const page = (items: unknown[]) => ({
  items,
  page: 1,
  page_size: 100,
  total: items.length,
  total_pages: 1,
  has_next: false,
});

function setup(onPatch: (body: unknown) => Response) {
  const patches: unknown[] = [];
  const route: Route = async (req, url) => {
    if (url.pathname === "/api/v1/channels")
      return json(
        page([{ id: 3, name: "Product", slug: "product", is_private: false, meeting_count: 1 }]),
      );
    if (url.pathname === "/api/v1/users")
      return json(
        page([
          { id: 5, name: "Dana Lee", email: "d@x.io" },
          { id: 1, name: "Sarah Watts", email: "s@x.io" },
        ]),
      );
    if (req.method === "PATCH" && url.pathname === "/api/v1/meetings/7") {
      const body = await req.json();
      patches.push(body);
      return onPatch(body);
    }
    return undefined;
  };
  vi.stubGlobal("fetch", vi.fn(routeFetch(route)));
  const onClose = vi.fn();
  renderWithClient(<EditMeetingModal meeting={meeting} mode="edit" onClose={onClose} />);
  return { patches, onClose };
}

describe("EditMeetingModal", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("blocks an empty title without calling the API", async () => {
    const { patches } = setup(() => json(meeting));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Give the meeting a title.")).toBeTruthy();
    expect(patches).toHaveLength(0);
  });

  it("sends only what changed: new title, removed and added participants (suggestion picked)", async () => {
    const { patches, onClose } = setup(() => json({ ...meeting, title: "Renamed" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: " Renamed " } });
    fireEvent.click(screen.getByRole("button", { name: "Remove Chris" }));
    const input = screen.getByRole("combobox", { name: "Participants" });
    // Users load lazily; wait for the suggestion, then pick it with Enter.
    fireEvent.change(input, { target: { value: "dan" } });
    await screen.findByRole("option", { name: "Dana Lee" });
    fireEvent.keyDown(input, { key: "Enter" });
    // Already present (case-insensitive): not added twice, and never suggested.
    fireEvent.change(input, { target: { value: "sarah watts" } });
    expect(screen.queryByRole("option")).toBeNull();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getAllByText("Sarah Watts")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(patches).toEqual([
      {
        title: "Renamed",
        participants: [
          { id: 11, display_name: "Sarah Watts" },
          { id: 12, display_name: "Janice" },
          { display_name: "Dana Lee" },
        ],
      },
    ]);
  });

  it("shows a participant name clash (409) inline and stays open", async () => {
    const { onClose } = setup(() =>
      errorJson(409, "PARTICIPANT_NAME_TAKEN", "Two participants would share a name"),
    );
    const input = screen.getByRole("combobox", { name: "Participants" });
    fireEvent.change(input, { target: { value: "Pat" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Two participants can't share a name.")).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});
