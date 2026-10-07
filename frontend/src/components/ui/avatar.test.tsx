import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { initials, speakerIndex } from "@/lib/utils/identity";

import { Avatar, AvatarGroup } from "./avatar";

describe("Avatar", () => {
  test("shows initials and exposes the name", () => {
    render(<Avatar name="Maya Chen" />);
    expect(screen.getByRole("img", { name: "Maya Chen" }).textContent).toBe("MC");
  });

  test("initials and colour bucket are stable", () => {
    expect(initials("sam")).toBe("S");
    expect(initials("  ")).toBe("?");
    expect(speakerIndex("Maya Chen")).toBe(speakerIndex("Maya Chen"));
    expect(speakerIndex("Maya Chen")).toBeGreaterThanOrEqual(0);
    expect(speakerIndex("Maya Chen")).toBeLessThan(8);
  });
});

describe("AvatarGroup", () => {
  const names = ["Aarush Rajoura", "Maya Chen", "Sam Patel", "Lena Ortiz", "Kiran Rao"];

  test("shows max avatars and a +N overflow", () => {
    render(<AvatarGroup names={names} max={3} />);
    expect(screen.getAllByRole("img")).toHaveLength(3);
    expect(screen.getByLabelText("2 more").textContent).toBe("+2");
  });

  test("no overflow chip when everyone fits", () => {
    render(<AvatarGroup names={names.slice(0, 2)} max={3} />);
    expect(screen.queryByText(/^\+/)).toBeNull();
  });
});
