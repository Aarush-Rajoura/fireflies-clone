import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { formatTimestamp, TimestampButton } from "./timestamp-button";

describe("TimestampButton", () => {
  it("shows the clock, names itself and seeks to its ms", () => {
    const onSeek = vi.fn();
    render(<TimestampButton ms={724_500} onSeek={onSeek} />);
    const button = screen.getByRole("button", { name: "Jump to 12:04" });
    expect(button.textContent).toBe("12:04");
    fireEvent.click(button);
    expect(onSeek).toHaveBeenCalledWith(724_500);
  });

  it("accepts custom text and label", () => {
    render(
      <TimestampButton ms={0} onSeek={() => {}} label="Jump to Intro">
        00:00 – 10:12
      </TimestampButton>,
    );
    expect(screen.getByRole("button", { name: "Jump to Intro" }).textContent).toBe("00:00 – 10:12");
  });

  it("formats hours", () => {
    expect(formatTimestamp(3_723_000)).toBe("1:02:03");
    expect(formatTimestamp(-5)).toBe("0:00");
  });
});
