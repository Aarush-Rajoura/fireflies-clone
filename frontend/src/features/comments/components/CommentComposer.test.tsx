import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/components/ui";

import { commentBodyError } from "../lib/body";
import { CommentComposer } from "./CommentComposer";

describe("commentBodyError", () => {
  it("matches the server's 1–2000 characters after trimming", () => {
    expect(commentBodyError("   ")).toBe("Write a comment first.");
    expect(commentBodyError("ok")).toBeNull();
    expect(commentBodyError(` ${"x".repeat(2000)} `)).toBeNull();
    expect(commentBodyError("x".repeat(2001))).toBe(
      "Comments can be up to 2,000 characters (1 over).",
    );
  });
});

function renderComposer(onSubmit = vi.fn(() => Promise.resolve())) {
  render(
    <AppProviders>
      <CommentComposer anchor={{ segmentId: 101, startMs: 12_000 }} onSubmit={onSubmit} />
    </AppProviders>,
  );
  return { onSubmit, box: screen.getByRole("textbox", { name: "Add a comment" }) };
}

describe("CommentComposer", () => {
  it("refuses an empty or over-long comment with a message", () => {
    const { onSubmit, box } = renderComposer();
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    expect(screen.getByRole("alert").textContent).toBe("Write a comment first.");

    fireEvent.change(box, { target: { value: "x".repeat(2005) } });
    expect(screen.getByRole("alert").textContent).toBe(
      "Comments can be up to 2,000 characters (5 over).",
    );
    expect(box.getAttribute("aria-invalid")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("posts attached to the line by default, or to the whole meeting when unpinned", async () => {
    const { onSubmit, box } = renderComposer();
    fireEvent.change(box, { target: { value: "Pricing needs a second look" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Comment" })));
    expect(onSubmit).toHaveBeenLastCalledWith("Pricing needs a second look", 101);
    expect((box as HTMLTextAreaElement).value).toBe("");

    fireEvent.click(screen.getByRole("button", { name: /Attached to 0:12/ }));
    fireEvent.change(box, { target: { value: "General note" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Comment" })));
    expect(onSubmit).toHaveBeenLastCalledWith("General note", null);
  });

  it("gives the text back when posting fails", async () => {
    const { box } = renderComposer(vi.fn(() => Promise.reject(new Error("down"))));
    fireEvent.change(box, { target: { value: "Keep me" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Comment" })));
    expect((box as HTMLTextAreaElement).value).toBe("Keep me");
  });
});
