import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { RadioCardGroup } from "./radio-card";

const OPTIONS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
] as const;

function Harness({ onSubmit }: { onSubmit: () => void }) {
  const [value, setValue] = useState<"a" | "b" | "c" | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <RadioCardGroup label="Pick one" options={OPTIONS} value={value} onChange={setValue} />
    </form>
  );
}

describe("RadioCardGroup", () => {
  it("exposes a radiogroup whose first card is the tab stop when empty", () => {
    render(<Harness onSubmit={() => undefined} />);
    expect(screen.getByRole("radiogroup", { name: "Pick one" })).toBeTruthy();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1]);
    expect(radios.every((r) => r.getAttribute("aria-checked") === "false")).toBe(true);
  });

  it("selects with arrows (wrapping) and End, moving focus along", () => {
    render(<Harness onSubmit={() => undefined} />);
    const alpha = screen.getByRole("radio", { name: "Alpha" });
    fireEvent.keyDown(alpha, { key: "ArrowUp" });
    const gamma = screen.getByRole("radio", { name: "Gamma" });
    expect(gamma.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(gamma);
    fireEvent.keyDown(gamma, { key: "Home" });
    expect(alpha.getAttribute("aria-checked")).toBe("true");
    expect(alpha.tabIndex).toBe(0);
  });

  it("Enter selects an unchecked card, and submits the form from the checked one", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const beta = screen.getByRole("radio", { name: "Beta" });
    fireEvent.click(beta);
    expect(beta.getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(beta, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
