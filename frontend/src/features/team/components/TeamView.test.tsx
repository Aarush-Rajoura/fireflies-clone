import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Team, TeamMember } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { renderWithClient } from "@/test/render-with-client";

import { TeamView } from "./TeamView";

const fetchMyTeam = vi.fn();
const inviteMembers = vi.fn();
const changeMemberRole = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("../api", () => ({
  fetchMyTeam: () => fetchMyTeam(),
  inviteMembers: (id: number, body: unknown) => inviteMembers(id, body),
  changeMemberRole: (id: number, role: string) => changeMemberRole(id, role),
  createTeam: vi.fn(),
  renameTeam: vi.fn(),
  removeMember: vi.fn(),
  acceptInvite: vi.fn(),
}));

function member(over: Partial<TeamMember>): TeamMember {
  return {
    id: 1,
    team_id: 7,
    user_id: 1,
    email: "sarah@example.com",
    display_name: "Sarah Chen",
    avatar_url: null,
    role: "owner",
    status: "active",
    invite_url: null,
    invited_at: "2026-10-01T00:00:00Z",
    joined_at: "2026-10-01T00:00:00Z",
    ...over,
  };
}

const team: Team = {
  id: 7,
  name: "Acme",
  my_role: "owner",
  created_at: "2026-10-01T00:00:00Z",
  members: [
    member({}),
    member({ id: 2, user_id: 2, email: "bo@example.com", display_name: "Bo Li", role: "member" }),
    member({
      id: 3,
      user_id: null,
      email: "new@example.com",
      display_name: null,
      status: "invited",
      invite_url: "/join/abc",
      joined_at: null,
    }),
  ],
};

describe("TeamView", () => {
  beforeEach(() => {
    // jsdom lacks these; Radix Select calls them when opening.
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.releasePointerCapture = vi.fn();
    fetchMyTeam.mockReset().mockResolvedValue(team);
    inviteMembers.mockReset();
    changeMemberRole.mockReset();
  });

  it("shows the create-team empty state when the user has no team", async () => {
    fetchMyTeam.mockResolvedValue(null);
    renderWithClient(<TeamView />);
    expect(await screen.findByText("Create your team")).toBeTruthy();
  });

  it("lists members with role and status", async () => {
    renderWithClient(<TeamView />);
    const rows = await screen.findAllByTestId("team-member-row");
    expect(rows).toHaveLength(3);
    expect(within(rows[1]!).getByText("Bo Li")).toBeTruthy();
    expect(within(rows[2]!).getByText("invited")).toBeTruthy();
    expect(within(rows[2]!).getByRole("button", { name: "Copy invite link" })).toBeTruthy();
  });

  it("rolls the role back when the server refuses the change", async () => {
    changeMemberRole.mockRejectedValue(new ApiError("FORBIDDEN", 403, "No"));
    renderWithClient(<TeamView />);
    const select = await screen.findByRole("combobox", { name: "Role for Bo Li" });
    expect(select.textContent).toMatch(/Member/);
    fireEvent.pointerDown(select, { button: 0, ctrlKey: false, pointerType: "mouse" });
    const option = await screen.findByRole("option", { name: "Admin" });
    fireEvent.pointerUp(option, { pointerType: "mouse" });
    fireEvent.click(option);
    await waitFor(() => expect(changeMemberRole).toHaveBeenCalledWith(2, "admin"));
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Role for Bo Li" }).textContent).toMatch(
        /Member/,
      ),
    );
  });

  it("invites by email chips and shows the copyable links", async () => {
    inviteMembers.mockResolvedValue({
      invited: [
        member({ id: 9, email: "ana@example.com", status: "invited", invite_url: "/join/z" }),
      ],
      skipped: [],
    });
    renderWithClient(<TeamView inviteRequested />);
    const box = await screen.findByLabelText("Emails");

    fireEvent.change(box, { target: { value: "not-an-email" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect((await screen.findByRole("alert")).textContent).toMatch(/valid email/i);

    fireEvent.change(box, { target: { value: "ana@example.com" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(await screen.findByText("ana@example.com")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Send invites" }));
    await waitFor(() =>
      expect(inviteMembers).toHaveBeenCalledWith(7, {
        emails: ["ana@example.com"],
        role: "member",
      }),
    );
    expect(await screen.findByText(/no email was sent/i)).toBeTruthy();
  });
});
