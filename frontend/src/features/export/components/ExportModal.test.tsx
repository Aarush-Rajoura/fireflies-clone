import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/components/ui";
import { getToasts, resetToasts } from "@/components/ui/toast-store";
import { ApiError } from "@/lib/api";
import { makeQueryClient } from "@/lib/query/query-client";
import { downloadBlob } from "@/lib/utils/download";

import { fetchExport } from "../api";
import { ExportModal } from "./ExportModal";

vi.mock("@/lib/utils/download", () => ({ downloadBlob: vi.fn(), downloadUrl: vi.fn() }));
vi.mock("../api", () => ({ fetchExport: vi.fn() }));

function renderModal() {
  const onOpenChange = vi.fn();
  render(
    <QueryClientProvider client={makeQueryClient(() => undefined)}>
      <AppProviders>
        <ExportModal meetingId={7} open onOpenChange={onOpenChange} />
      </AppProviders>
    </QueryClientProvider>,
  );
  return { onOpenChange };
}

const toasts = () => getToasts().map((t) => [t.kind, t.message]);

describe("ExportModal", () => {
  afterEach(() => resetToasts());

  it("fetches the chosen format and sections, then saves the file and closes", async () => {
    const blob = new Blob(["# notes"]);
    vi.mocked(fetchExport).mockResolvedValue({ blob, filename: "launch.pdf" });
    const { onOpenChange } = renderModal();
    fireEvent.click(screen.getByRole("tab", { name: "PDF" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Transcript" }));
    await act(async () => void fireEvent.click(screen.getByRole("button", { name: "Download" })));

    const [id, request] = vi.mocked(fetchExport).mock.calls[0]!;
    expect(id).toBe(7);
    expect(request.format).toBe("pdf");
    expect([...request.sections]).toEqual(["summary", "action_items"]);
    expect(downloadBlob).toHaveBeenCalledWith(blob, "launch.pdf");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toasts()).toEqual([["success", "Downloading…"]]);
  });

  it.each([
    [new ApiError("NOT_FOUND", 404, "x"), "This meeting no longer exists."],
    [new ApiError("GONE", 410, "x"), "This meeting was deleted. Restore it to export it."],
    [new ApiError("EXPORT_SECTION_UNKNOWN", 422, "Unknown section"), "Unknown section"],
    [new ApiError("INTERNAL", 500, "boom"), "Couldn't export the meeting. Please try again."],
  ])("toasts %s without saving anything and stays open", async (error, message) => {
    vi.mocked(fetchExport).mockRejectedValue(error);
    const { onOpenChange } = renderModal();
    await act(async () => void fireEvent.click(screen.getByRole("button", { name: "Download" })));

    expect(downloadBlob).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(toasts()).toEqual([["error", message]]);
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
