import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, test } from "vitest";

import { SegmentedControl } from "./segmented-control";

function Harness() {
  const [value, setValue] = useState("recent");
  return (
    <SegmentedControl
      label="Home feed"
      value={value}
      onChange={setValue}
      options={[
        { value: "recent", label: "Recent" },
        { value: "upcoming", label: "Upcoming" },
        { value: "feed", label: "AI Feed" },
      ]}
    />
  );
}

const selected = () => screen.getByRole("tab", { selected: true }).textContent;

describe("SegmentedControl", () => {
  test("exposes a labelled tablist with one tab stop", () => {
    render(<Harness />);
    expect(screen.getByRole("tablist", { name: "Home feed" })).toBeTruthy();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1]);
  });

  test("arrow keys move selection and focus, wrapping around", () => {
    render(<Harness />);
    const first = screen.getByRole("tab", { name: "Recent" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(selected()).toBe("Upcoming");
    expect(document.activeElement?.textContent).toBe("Upcoming");
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowLeft" });
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowLeft" });
    expect(selected()).toBe("AI Feed");
  });

  test("Home and End jump to the ends; click selects", () => {
    render(<Harness />);
    const first = screen.getByRole("tab", { name: "Recent" });
    fireEvent.keyDown(first, { key: "End" });
    expect(selected()).toBe("AI Feed");
    fireEvent.keyDown(document.activeElement as Element, { key: "Home" });
    expect(selected()).toBe("Recent");
    fireEvent.click(screen.getByRole("tab", { name: "Upcoming" }));
    expect(selected()).toBe("Upcoming");
  });

  test("points only the selected tab at its panel when a panel prefix is given", () => {
    render(
      <SegmentedControl
        label="Feed"
        value="b"
        onChange={() => undefined}
        panelIdPrefix="panel"
        options={[
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ]}
      />,
    );
    expect(screen.getByRole("tab", { name: "B" }).getAttribute("aria-controls")).toBe("panel-b");
    expect(screen.getByRole("tab", { name: "A" }).getAttribute("aria-controls")).toBeNull();
  });
});
