import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { SearchInput } from "./search-input";

describe("SearchInput", () => {
  test("Escape clears and searches immediately, after the caller's onKeyDown", () => {
    const onSearch = vi.fn();
    const onKeyDown = vi.fn();
    render(<SearchInput label="Search" defaultValue="fred" onSearch={onSearch} onKeyDown={onKeyDown} />);
    const box = screen.getByRole("searchbox", { name: "Search" }) as HTMLInputElement;
    fireEvent.keyDown(box, { key: "Escape" });
    expect(onKeyDown).toHaveBeenCalledOnce();
    expect(box.value).toBe("");
    expect(onSearch).toHaveBeenCalledWith("");
  });

  test("a caller that prevents default keeps Escape for itself", () => {
    render(<SearchInput label="Search" defaultValue="fred" onKeyDown={(e) => e.preventDefault()} />);
    const box = screen.getByRole("searchbox") as HTMLInputElement;
    fireEvent.keyDown(box, { key: "Escape" });
    expect(box.value).toBe("fred");
  });

  test("typing is debounced", () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(<SearchInput label="Search" onSearch={onSearch} debounceMs={200} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "ac" } });
    expect(onSearch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(onSearch).toHaveBeenCalledWith("ac");
    vi.useRealTimers();
  });
});
