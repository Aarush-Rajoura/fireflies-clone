import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Dropzone } from "./dropzone";

function setup(onFiles = vi.fn()) {
  render(
    <Dropzone label="Choose a file" onFiles={onFiles}>
      <span>Drop here</span>
    </Dropzone>,
  );
  const zone = screen.getByLabelText("Choose a file").closest("label") as HTMLLabelElement;
  return { zone, child: screen.getByText("Drop here"), onFiles };
}

describe("Dropzone", () => {
  it("stays highlighted while the drag moves over its children", () => {
    const { zone, child } = setup();
    fireEvent.dragEnter(zone);
    fireEvent.dragEnter(child);
    fireEvent.dragLeave(zone); // leaving the zone's own box for the child
    expect(zone.dataset.dragging).toBe("true");
    fireEvent.dragLeave(child);
    expect(zone.dataset.dragging).toBeUndefined();
  });

  it("hands dropped files over and clears the highlight", () => {
    const { zone, onFiles } = setup();
    const file = new File(["x"], "a.vtt");
    fireEvent.dragEnter(zone);
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    expect(onFiles).toHaveBeenCalledWith([file]);
    expect(zone.dataset.dragging).toBeUndefined();
  });

  it("hands picked files over from the hidden input", () => {
    const { onFiles } = setup();
    const file = new File(["x"], "a.srt");
    fireEvent.change(screen.getByLabelText("Choose a file"), { target: { files: [file] } });
    expect(onFiles).toHaveBeenCalledWith([file]);
  });
});
