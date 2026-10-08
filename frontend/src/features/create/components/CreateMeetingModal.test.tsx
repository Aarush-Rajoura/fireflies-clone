import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/components/ui";
import { getToasts, resetToasts } from "@/components/ui/toast-store";
import { ApiError, type MeetingDetail, type TranscriptPreview } from "@/lib/api";

import * as api from "../api";
import { MAX_UPLOAD_BYTES } from "../lib/file-validation";
import { closeCreateMeeting, openCreateMeeting } from "../lib/modal-store";
import { SAMPLE_TRANSCRIPT } from "../lib/sample-transcript";

import { CreateMeetingModal } from "./CreateMeetingModal";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/features/channels", () => ({
  useChannels: () => ({ data: [{ id: 2, name: "sales" }], isPending: false }),
}));
vi.mock("../api", () => ({
  previewTranscriptText: vi.fn(),
  previewTranscriptFile: vi.fn(),
  createMeeting: vi.fn(),
}));

const preview: TranscriptPreview = {
  format: "vtt",
  timings_estimated: false,
  speakers: ["Priya Raman", "Daniel Okafor"],
  segment_count: 2,
  duration_ms: 23_000,
  warnings: ["Line 4 had no speaker; attributed to Unknown."],
  segments: [
    { speaker: "Priya Raman", start_ms: 0, end_ms: 11_000, text: "Morning all." },
    { speaker: "Daniel Okafor", start_ms: 11_000, end_ms: 23_000, text: "Morning!" },
  ],
};

function setup(tab: Parameters<typeof openCreateMeeting>[0] = "upload") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AppProviders>
        <CreateMeetingModal />
      </AppProviders>
    </QueryClientProvider>,
  );
  act(() => openCreateMeeting(tab));
  return { client };
}

const tab = (name: RegExp) => screen.getByRole("tab", { name });

beforeEach(() => {
  resetToasts();
  push.mockReset();
});
afterEach(() => act(() => closeCreateMeeting()));

describe("CreateMeetingModal", () => {
  it("opens on the requested tab and switches tabs", () => {
    setup("paste");
    expect(tab(/^Paste$/).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByLabelText("Transcript")).toBeTruthy();

    fireEvent.click(tab(/^Form$/));
    expect(screen.getByLabelText("Title")).toBeTruthy();
    expect(screen.queryByLabelText("Transcript")).toBeNull();

    fireEvent.click(tab(/Upload audio\/video/));
    fireEvent.click(screen.getByRole("button", { name: "Upload a transcript instead" }));
    expect(tab(/Upload transcript/).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByLabelText("Choose a transcript file")).toBeTruthy();
  });

  it("pastes the sample, previews, then creates and navigates once", async () => {
    vi.mocked(api.previewTranscriptText).mockResolvedValue(preview);
    vi.mocked(api.createMeeting).mockResolvedValue({ id: 42 } as MeetingDetail);
    const { client } = setup("paste");
    const invalidate = vi.spyOn(client, "invalidateQueries");

    fireEvent.click(screen.getByRole("button", { name: "Load sample" }));
    expect((screen.getByLabelText("Transcript") as HTMLTextAreaElement).value).toBe(
      SAMPLE_TRANSCRIPT,
    );
    fireEvent.click(screen.getByRole("button", { name: "Preview transcript" }));

    await screen.findByLabelText("Transcript preview");
    expect(api.previewTranscriptText).toHaveBeenCalledWith(SAMPLE_TRANSCRIPT);
    expect(screen.getByText("Line 4 had no speaker; attributed to Unknown.")).toBeTruthy();
    // Participants are prefilled from the speakers.
    expect(screen.getByRole("button", { name: "Remove Priya Raman" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Roadmap sync" } });
    fireEvent.click(screen.getByRole("button", { name: "Create meeting" }));

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(push).toHaveBeenCalledWith("/meetings/42");
    expect(api.createMeeting).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Roadmap sync",
        source: "paste",
        participants: ["Priya Raman", "Daniel Okafor"],
        segments: preview.segments,
        channel_id: null,
      }),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["meetings", "list"] });
    expect(getToasts().map((t) => t.message)).toContain("Meeting created");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("rejects an oversize file before uploading it", () => {
    setup("upload");
    const big = new File(["x"], "huge.vtt", { type: "text/vtt" });
    Object.defineProperty(big, "size", { value: MAX_UPLOAD_BYTES + 1 });
    fireEvent.change(screen.getByLabelText("Choose a transcript file"), {
      target: { files: [big] },
    });
    expect(screen.getByRole("alert").textContent).toMatch(/larger than 10 MB/);
    expect(api.previewTranscriptFile).not.toHaveBeenCalled();
  });

  it("previews an upload with the file name as the default title, source upload", async () => {
    vi.mocked(api.previewTranscriptFile).mockResolvedValue(preview);
    vi.mocked(api.createMeeting).mockResolvedValue({ id: 7 } as MeetingDetail);
    setup("upload");
    const vtt = new File(["WEBVTT"], "design_review.vtt", { type: "text/vtt" });
    fireEvent.change(screen.getByLabelText("Choose a transcript file"), {
      target: { files: [vtt] },
    });

    await screen.findByLabelText("Transcript preview");
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("design review");
    fireEvent.click(screen.getByRole("button", { name: "Create meeting" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/meetings/7"));
    expect(api.createMeeting).toHaveBeenCalledWith(
      expect.objectContaining({ source: "upload", title: "design review" }),
    );
  });

  it("shows a parse error inline and a create error without losing the form", async () => {
    vi.mocked(api.previewTranscriptText).mockRejectedValueOnce(
      new ApiError("TRANSCRIPT_UNRECOGNISED", 422, "nope"),
    );
    setup("paste");
    fireEvent.change(screen.getByLabelText("Transcript"), { target: { value: "???" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview transcript" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/couldn't read that/);

    vi.mocked(api.createMeeting).mockRejectedValueOnce(new ApiError("AI_UNAVAILABLE", 503, "x"));
    fireEvent.click(tab(/^Form$/));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Planning" } });
    fireEvent.click(screen.getByRole("button", { name: "Create meeting" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/couldn't write your notes/);
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("Planning");
    expect(api.createMeeting).toHaveBeenCalledWith(
      expect.objectContaining({ source: "manual", segments: null }),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("requires a title", () => {
    setup("form");
    fireEvent.click(screen.getByRole("button", { name: "Create meeting" }));
    expect(screen.getByText("Give the meeting a title.")).toBeTruthy();
    expect(api.createMeeting).not.toHaveBeenCalled();
  });
});
