import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { renderWithClient } from "@/test/render-with-client";

import { JoinInvite } from "./JoinInvite";

const push = vi.fn();
const accept = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock("../api", () => ({ acceptInvite: (token: string) => accept(token) }));

describe("JoinInvite", () => {
  beforeEach(() => {
    push.mockReset();
    accept.mockReset();
  });

  it("does nothing on render; accepts on click and opens the team page", async () => {
    accept.mockResolvedValue({ id: 1, status: "active" });
    renderWithClient(<JoinInvite token="tok123" />);
    expect(accept).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Accept invite" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/team"));
    expect(accept).toHaveBeenCalledWith("tok123");
    expect(screen.getByText("You're in")).toBeTruthy();
  });

  it("explains an invalid or expired link and lets the user retry", async () => {
    accept.mockRejectedValue(new ApiError("INVITE_NOT_FOUND", 404, "Invite not found"));
    renderWithClient(<JoinInvite token="bad" />);
    fireEvent.click(screen.getByRole("button", { name: "Accept invite" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/invalid or has expired/);
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Accept invite" })).toBeTruthy();
  });
});
