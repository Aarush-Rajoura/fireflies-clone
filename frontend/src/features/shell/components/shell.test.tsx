import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/components/ui";

import { NAV_FOOTER, NAV_GROUPS } from "../nav";

import { IconRail } from "./IconRail";
import { ProfileMenu } from "./ProfileMenu";

vi.mock("next/navigation", () => ({
  usePathname: () => "/meetings/3",
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/features/user", () => ({
  useMe: () => ({
    data: { id: 1, name: "Ada Lovelace", email: "ada@example.com", avatar_url: null },
  }),
}));

const renderInApp = (ui: React.ReactElement) => render(<AppProviders>{ui}</AppProviders>);

describe("IconRail", () => {
  beforeEach(() => window.localStorage.clear());

  it("gives every icon an accessible name (also its tooltip text)", () => {
    renderInApp(<IconRail expanded={false} onToggle={() => undefined} />);
    for (const item of [...NAV_GROUPS.flat(), ...NAV_FOOTER]) {
      expect(screen.getByLabelText(item.label)).toBeTruthy();
    }
    // Collapsed: no visible text labels, names come from aria-label.
    expect(screen.queryByText("Meetings")).toBeNull();
  });

  it("marks the route's item as the current page", () => {
    renderInApp(<IconRail expanded={false} onToggle={() => undefined} />);
    expect(screen.getByLabelText("Meetings").getAttribute("aria-current")).toBe("page");
    expect(screen.getByLabelText("Home").getAttribute("aria-current")).toBeNull();
  });

  it("shows text labels when expanded", () => {
    renderInApp(<IconRail expanded onToggle={() => undefined} />);
    expect(screen.getByText("Meetings")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeTruthy();
  });
});

describe("ProfileMenu", () => {
  it("greets the /me user and shows plan and storage", () => {
    renderInApp(<ProfileMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));
    expect(screen.getByText("Hi Ada Lovelace")).toBeTruthy();
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(screen.getByText("3 left / 3 free meetings")).toBeTruthy();
    expect(screen.getByText("0 / 400 mins")).toBeTruthy();
    for (const row of [
      "Playlist",
      "Settings",
      "My Team",
      "Manage Web Logins",
      "Platform Rules",
      "Logout",
    ]) {
      expect(screen.getByText(row)).toBeTruthy();
    }
    expect(screen.getByText("Chrome Extension")).toBeTruthy();
  });
});
