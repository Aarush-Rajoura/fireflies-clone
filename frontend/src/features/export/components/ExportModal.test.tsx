import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/components/ui";
import { downloadUrl } from "@/lib/utils/download";

import { ExportModal } from "./ExportModal";

vi.mock("@/lib/utils/download", () => ({ downloadUrl: vi.fn() }));

function renderModal() {
  const onOpenChange = vi.fn();
  render(
    <AppProviders>
      <ExportModal meetingId={7} open onOpenChange={onOpenChange} />
    </AppProviders>,
  );
  return { onOpenChange };
}

describe("ExportModal", () => {
  it("downloads the chosen format and sections, then closes", () => {
    const { onOpenChange } = renderModal();
    fireEvent.click(screen.getByRole("tab", { name: "PDF" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Transcript" }));
    fireEvent.click(screen.getByRole("button", { name: "Download" }));

    expect(downloadUrl).toHaveBeenCalledTimes(1);
    const url = new URL(vi.mocked(downloadUrl).mock.calls[0]![0], "http://app.test");
    expect(url.pathname).toBe("/api/v1/meetings/7/export");
    expect(url.searchParams.get("format")).toBe("pdf");
    expect(url.searchParams.get("sections")).toBe("summary,action_items");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables Download and explains why when no section is picked", () => {
    renderModal();
    for (const name of ["Summary", "Action items", "Transcript"]) {
      fireEvent.click(screen.getByRole("checkbox", { name }));
    }
    expect((screen.getByRole("button", { name: "Download" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(screen.getByRole("alert").textContent).toContain("at least one section");
  });
});
