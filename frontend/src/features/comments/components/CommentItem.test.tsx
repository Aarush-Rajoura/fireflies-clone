import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/components/ui";
import type { MeetingComment } from "@/lib/api";

import { CommentItem, type CommentItemProps } from "./CommentItem";

const base: MeetingComment = {
  id: 5,
  meeting_id: 1,
  segment_id: 101,
  author: { id: 3, name: "Sarah Watts", avatar_url: null },
  body: "Check the numbers",
  created_at: "2026-10-08T10:00:00.120Z",
  updated_at: "2026-10-08T10:00:00.350Z",
};

function renderItem(props: Partial<CommentItemProps> = {}) {
  const handlers = { onSeek: vi.fn(), onSave: vi.fn(), onDelete: vi.fn() };
  render(
    <AppProviders>
      <ul>
        <CommentItem comment={base} segmentStartMs={12_000} isOwn {...handlers} {...props} />
      </ul>
    </AppProviders>,
  );
  return handlers;
}

/** Radix menus open on pointerdown, not click. */
function openActions() {
  const trigger = screen.getByRole("button", { name: "Comment actions" });
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
}

describe("CommentItem", () => {
  it("shows author, body and a timestamp chip that seeks", () => {
    const { onSeek } = renderItem();
    expect(screen.getByText("Sarah Watts")).toBeTruthy();
    expect(screen.getByText("Check the numbers")).toBeTruthy();
    // Stamps a few ms apart are one create, not an edit.
    expect(screen.queryByText(/edited/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Jump to 0:12" }));
    expect(onSeek).toHaveBeenCalledWith(12_000);
  });

  it("offers no actions on someone else's comment", () => {
    renderItem({ isOwn: false });
    expect(screen.queryByRole("button", { name: "Comment actions" })).toBeNull();
  });

  it("edits an own comment in place, refusing an empty body", () => {
    const { onSave } = renderItem();
    openActions();
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    const box = screen.getByRole("textbox", { name: "Edit comment" });
    fireEvent.change(box, { target: { value: "   " } });
    expect(screen.getByText("Write a comment first.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save" }).hasAttribute("disabled")).toBe(true);

    fireEvent.change(box, { target: { value: "Check the Q3 numbers" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith("Check the Q3 numbers");
    expect(screen.queryByRole("textbox", { name: "Edit comment" })).toBeNull();
  });

  it("asks the panel to delete an own comment", () => {
    const { onDelete } = renderItem();
    openActions();
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalled();
  });

  it("marks a placeholder as sending, without actions", () => {
    renderItem({ comment: { ...base, id: -1 } });
    expect(screen.getByText("Sending…")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Comment actions" })).toBeNull();
  });
});
