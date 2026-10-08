import { fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it } from "vitest";

import { useSearchShortcut } from "./useSearchShortcut";

function Harness() {
  const ref = useRef<HTMLInputElement>(null);
  useSearchShortcut(ref);
  return (
    <>
      <input aria-label="search" ref={ref} />
      <input aria-label="title" />
      <textarea aria-label="notes" />
      <div aria-label="editor" contentEditable suppressContentEditableWarning />
      <button type="button">plain</button>
    </>
  );
}

const press = (target: Element, init: KeyboardEventInit) =>
  fireEvent.keyDown(target, { key: "k", ...init });

describe("Ctrl/Cmd+K", () => {
  it("focuses the search from anywhere outside a text field", () => {
    render(<Harness />);
    const search = screen.getByLabelText("search");
    const plain = screen.getByRole("button", { name: "plain" });
    plain.focus();
    expect(press(plain, { ctrlKey: true })).toBe(false); // default prevented
    expect(document.activeElement).toBe(search);

    plain.focus();
    press(document.body, { metaKey: true, key: "K" });
    expect(document.activeElement).toBe(search);
  });

  it("leaves the keystroke to other inputs, textareas and editors", () => {
    render(<Harness />);
    const search = screen.getByLabelText("search");
    for (const label of ["title", "notes", "editor"]) {
      const field = screen.getByLabelText(label);
      field.focus();
      expect(press(field, { ctrlKey: true })).toBe(true); // not prevented
      expect(document.activeElement).not.toBe(search);
    }
  });

  it("still works while the search itself is focused, and ignores other chords", () => {
    render(<Harness />);
    const search = screen.getByLabelText("search");
    search.focus();
    expect(press(search, { ctrlKey: true })).toBe(false);

    const plain = screen.getByRole("button", { name: "plain" });
    plain.focus();
    press(plain, {});
    press(plain, { ctrlKey: true, shiftKey: true });
    press(plain, { ctrlKey: true, key: "j" });
    expect(document.activeElement).toBe(plain);
  });
});
