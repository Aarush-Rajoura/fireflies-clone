import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/components/ui";

import { CaptureModal } from "./CaptureModal";

const openCreateMeeting = vi.fn();
vi.mock("@/features/create", () => ({
  openCreateMeeting: (...args: unknown[]) => openCreateMeeting(...args),
}));

describe("CaptureModal", () => {
  it("explains live capture is unavailable and hands off to the upload tab", () => {
    const onOpenChange = vi.fn();
    render(
      <AppProviders>
        <CaptureModal open onOpenChange={onOpenChange} />
      </AppProviders>,
    );
    expect(screen.getByLabelText("Meeting name")).toBeTruthy();
    expect(screen.getByLabelText("Meeting link")).toBeTruthy();
    expect(screen.getByText(/can't join live calls in this demo/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Upload a transcript" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(openCreateMeeting).toHaveBeenCalledWith("upload");
  });
});
