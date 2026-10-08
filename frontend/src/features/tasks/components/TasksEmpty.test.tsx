import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TasksEmpty } from "./TasksEmpty";

describe("TasksEmpty", () => {
  it("shows the reference copy and opens a new task", () => {
    const onNew = vi.fn();
    render(<TasksEmpty onNew={onNew} />);
    expect(screen.getByText("All your meeting tasks in one place")).toBeTruthy();
    expect(screen.getByText("Manage, assign and update all your meeting tasks here.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    expect(onNew).toHaveBeenCalledOnce();
  });

  it("offers to clear filters when they hide every task", () => {
    const onClear = vi.fn();
    render(<TasksEmpty onNew={() => {}} onClearFilters={onClear} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
