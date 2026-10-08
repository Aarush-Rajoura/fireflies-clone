import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { IntegrationCategoryInfo } from "@/lib/api";

import { CategoryChips } from "./CategoryChips";

const CATEGORIES: IntegrationCategoryInfo[] = [
  { key: "audio-recording", label: "Audio recording", count: 2 },
  { key: "ats", label: "Applicant tracking system", count: 2 },
  { key: "crm", label: "CRM", count: 3 },
  { key: "mcp", label: "MCP", count: 1 },
  { key: "project-management", label: "Project management", count: 6 },
];

describe("CategoryChips", () => {
  it("shows All and the headline categories, with the rest behind More", () => {
    const onChange = vi.fn();
    render(<CategoryChips categories={CATEGORIES} value={undefined} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "All" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("button", { name: "Project management" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "CRM" }));
    expect(onChange).toHaveBeenCalledWith("crm");
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it("names the active overflow category on the More chip", () => {
    render(<CategoryChips categories={CATEGORIES} value="project-management" onChange={vi.fn()} />);
    const more = screen.getByRole("button", { name: "Project management" });
    expect(more.getAttribute("aria-pressed")).toBe("true");
    expect(more.getAttribute("aria-haspopup")).toBe("menu");
  });
});
