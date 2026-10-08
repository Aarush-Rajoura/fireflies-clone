import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingGate } from "./OnboardingGate";

const replace = vi.fn();
let me: { onboarded_at: string | null } | undefined;

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/features/user", () => ({ useMe: () => ({ data: me }) }));

describe("OnboardingGate", () => {
  beforeEach(() => replace.mockReset());

  it("renders the app for an onboarded user", () => {
    me = { onboarded_at: "2026-10-01T00:00:00Z" };
    render(<OnboardingGate>app</OnboardingGate>);
    expect(screen.getByText("app")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("renders the app while /me is still loading", () => {
    me = undefined;
    render(<OnboardingGate>app</OnboardingGate>);
    expect(screen.getByText("app")).toBeTruthy();
  });

  it("redirects to the wizard while onboarding is unfinished", () => {
    me = { onboarded_at: null };
    render(<OnboardingGate>app</OnboardingGate>);
    expect(screen.queryByText("app")).toBeNull();
    expect(replace).toHaveBeenCalledWith("/onboarding");
  });
});
