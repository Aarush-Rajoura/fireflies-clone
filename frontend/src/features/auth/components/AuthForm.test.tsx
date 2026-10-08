import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getToasts, resetToasts } from "@/components/ui/toast-store";
import { renderWithClient } from "@/test/render-with-client";

import { AuthForm } from "./AuthForm";

const push = vi.fn();
let onboardedAt: string | null = "2026-10-01T00:00:00Z";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/features/user", () => ({
  meQuery: {
    queryKey: ["me"],
    queryFn: () => Promise.resolve({ id: 1, name: "Ada", onboarded_at: onboardedAt }),
  },
}));

describe("AuthForm", () => {
  beforeEach(() => {
    push.mockReset();
    resetToasts();
    onboardedAt = "2026-10-01T00:00:00Z";
  });

  it("log in with the demo account opens Meetings for an onboarded user", async () => {
    renderWithClient(<AuthForm mode="login" />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with demo account" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/meetings"));
  });

  it("log in sends a user who has not onboarded to the wizard", async () => {
    onboardedAt = null;
    renderWithClient(<AuthForm mode="login" />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with demo account" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/onboarding"));
  });

  it("validates the email form before continuing, then signs up into onboarding", async () => {
    renderWithClient(<AuthForm mode="signup" />);
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByText("Enter your work email.")).toBeTruthy();
    expect(push).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Work email"), { target: { value: "ada@acme.io" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct horse" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/onboarding"));
  });

  it("shows the demo-mode note and a coming-soon toast for social sign-in", () => {
    renderWithClient(<AuthForm mode="login" />);
    expect(screen.getByRole("note").textContent).toMatch(/no real account is created/);
    fireEvent.click(screen.getByRole("button", { name: "Google" }));
    expect(getToasts().at(-1)?.message).toMatch(/Google is coming soon/);
  });
});
