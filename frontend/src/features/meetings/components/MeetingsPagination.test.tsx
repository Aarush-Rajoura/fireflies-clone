import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/components/ui";

import { MeetingsPagination } from "./MeetingsPagination";

const renderPager = (props: {
  page: number;
  itemCount: number;
  total: number;
  totalPages: number;
}) =>
  render(
    <AppProviders>
      <MeetingsPagination pageSize={20} onPageChange={vi.fn()} {...props} />
    </AppProviders>,
  );

describe("MeetingsPagination", () => {
  it("counts the rows actually on a short last page", () => {
    renderPager({ page: 3, itemCount: 1, total: 41, totalPages: 3 });
    expect(screen.getByText("Showing 41–41 of 41")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next page" }).hasAttribute("disabled")).toBe(true);
  });

  it("renders nothing for an out-of-range page while it is clamped", () => {
    const { container } = renderPager({ page: 9, itemCount: 0, total: 41, totalPages: 3 });
    expect(container.querySelector("nav")).toBeNull();
  });
});
