import { render, screen } from "@testing-library/react";
import { Bell } from "lucide-react";
import { describe, expect, test } from "vitest";

import { Button } from "./button";
import { IconButton } from "./icon-button";

describe("IconButton", () => {
  test("label becomes the accessible name", () => {
    render(<IconButton label="Notifications" icon={<Bell />} />);
    const button = screen.getByRole("button", { name: "Notifications" });
    expect(button.getAttribute("aria-label")).toBe("Notifications");
  });

  test("works without a tooltip too", () => {
    render(<IconButton label="Close" tooltip={false} icon={<Bell />} />);
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
  });
});

describe("Button", () => {
  test("loading disables the button and marks it busy", () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole("button", { name: /save/i });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });
});
