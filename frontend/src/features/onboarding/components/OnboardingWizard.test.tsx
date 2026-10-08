import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithClient } from "@/test/render-with-client";

import { OnboardingWizard } from "./OnboardingWizard";

const push = vi.fn();
const save = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock("@/features/user", () => ({
  useMe: () => ({
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    data: {
      id: 1,
      name: "Ada",
      email: "ada@example.com",
      onboarded_at: null,
      tools: [],
    },
  }),
}));
vi.mock("../api", () => ({ saveOnboarding: (body: unknown) => save(body) }));

const next = () => fireEvent.click(screen.getByRole("button", { name: /^Next/ }));
const heading = () => screen.getByRole("heading", { level: 1 }).textContent;

describe("OnboardingWizard", () => {
  beforeEach(() => {
    push.mockReset();
    save.mockReset().mockResolvedValue({ invites_sent: 1, onboarded_at: "2026-10-08T00:00:00Z" });
  });

  it("walks every step and saves the answers, then opens Home", async () => {
    renderWithClient(<OnboardingWizard />);
    expect(heading()).toBe("Which meetings should Fred join?");
    expect(screen.getByRole("button", { name: /^Next/ }).hasAttribute("disabled")).toBe(true);

    const owned = screen.getByRole("radio", { name: /Meetings I own/ });
    // Arrow keys move the selection inside the radio group.
    fireEvent.keyDown(owned, { key: "ArrowDown" });
    expect(screen.getByRole("radio", { name: /All meetings/ }).getAttribute("aria-checked")).toBe(
      "true",
    );
    next();

    expect(heading()).toBe("Who should receive meeting recaps?");
    fireEvent.click(screen.getByRole("radio", { name: /Only me/ }));
    next();

    expect(heading()).toBe("What do you do?");
    fireEvent.change(screen.getByLabelText("Job title"), { target: { value: " PM " } });
    // The role select is required for Next; Skip moves on and the default role is sent.
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    expect(heading()).toBe("Which tools do you use?");
    fireEvent.click(screen.getByRole("button", { name: /Slack/ }));
    fireEvent.click(screen.getByRole("button", { name: /Linear/ }));
    next();

    expect(heading()).toBe("Invite your coworkers");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("5");
    const box = screen.getByLabelText("Coworkers' emails");
    fireEvent.change(box, { target: { value: "bad@" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(screen.getByRole("alert").textContent).toMatch(/not a valid email/);
    fireEvent.change(box, { target: { value: "Grace@Navy.mil" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(screen.getByText("grace@navy.mil")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Send invites & finish" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/home"));
    expect(save).toHaveBeenCalledWith({
      join_preference: "all",
      recap_preference: "me",
      role: "Other",
      job_title: "PM",
      tools: ["slack", "linear"],
      invite_emails: ["grace@navy.mil"],
    });
  });

  it("Back returns to the previous question with the answer kept", () => {
    renderWithClient(<OnboardingWizard />);
    fireEvent.click(screen.getByRole("radio", { name: /Only when I invite Fred/ }));
    next();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(heading()).toBe("Which meetings should Fred join?");
    expect(
      screen.getByRole("radio", { name: /Only when I invite Fred/ }).getAttribute("aria-checked"),
    ).toBe("true");
  });
});
