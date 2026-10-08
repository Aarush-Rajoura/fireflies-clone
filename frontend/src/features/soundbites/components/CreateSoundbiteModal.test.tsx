import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/components/ui";
import { PlayerProvider, VirtualClockEngine } from "@/features/player";
import { ApiError, qk, type Soundbite } from "@/lib/api";

import { createSoundbite } from "../api";
import { CreateSoundbiteModal, type SoundbiteDraft } from "./CreateSoundbiteModal";

vi.mock("../api", () => ({
  createSoundbite: vi.fn(),
  fetchSoundbites: vi.fn(() => new Promise(() => {})),
}));

const onClose = vi.fn();
const onCreated = vi.fn();

let engine!: VirtualClockEngine;

/** Owns the draft like the page does, so closing really unmounts the form. */
function Host({ initial, durationMs }: { initial: SoundbiteDraft; durationMs: number }) {
  const [draft, setDraft] = useState<SoundbiteDraft | null>(initial);
  return (
    <CreateSoundbiteModal
      meetingId={7}
      durationMs={durationMs}
      draft={draft}
      onClose={() => {
        onClose();
        setDraft(null);
      }}
      onCreated={onCreated}
    />
  );
}

function renderModal(draft: SoundbiteDraft, durationMs = 60_000) {
  const client = new QueryClient();
  client.setQueryData(qk.soundbites(7), []);
  render(
    <QueryClientProvider client={client}>
      <AppProviders>
        <PlayerProvider
          durationMs={durationMs}
          createEngine={(a) => {
            engine = new VirtualClockEngine(a);
            return engine;
          }}
        >
          <Host initial={draft} durationMs={durationMs} />
        </PlayerProvider>
      </AppProviders>
    </QueryClientProvider>,
  );
  return client;
}

const create = () => screen.getByRole("button", { name: "Create soundbite" });

describe("CreateSoundbiteModal", () => {
  afterEach(() => vi.clearAllMocks());

  it("snaps the range to whole seconds and nudges it in 1 s steps", () => {
    renderModal({ start_ms: 10_400, end_ms: 13_200, title: "Pricing" });
    expect(screen.getByText("0:10 – 0:14 · 4s")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "End 1 second later" }));
    fireEvent.click(screen.getByRole("button", { name: "Start 1 second earlier" }));
    expect(screen.getByText("0:09 – 0:15 · 6s")).toBeTruthy();
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("Pricing");
  });

  it("explains a too-short clip and will not submit it", () => {
    renderModal({ start_ms: 10_000, end_ms: 13_000 });
    fireEvent.click(screen.getByRole("button", { name: "Start 1 second later" }));
    expect(screen.getByRole("alert").textContent).toBe(
      "A soundbite must be at least 3 seconds long.",
    );
    expect(create().hasAttribute("disabled")).toBe(true);
    // A step that would leave no clip at all is not offered.
    fireEvent.click(screen.getByRole("button", { name: "Start 1 second later" }));
    expect(
      screen.getByRole("button", { name: "Start 1 second later" }).hasAttribute("disabled"),
    ).toBe(true);
  });

  it("explains a clip longer than 3 minutes", () => {
    renderModal({ start_ms: 0, end_ms: 180_000 }, 600_000);
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "End 1 second later" }));
    expect(screen.getByRole("alert").textContent).toBe(
      "A soundbite can be at most 3 minutes long.",
    );
  });

  it("creates with the edited title and range, then closes", async () => {
    const saved: Soundbite = {
      id: 3,
      meeting_id: 7,
      title: "Decision",
      start_ms: 10_000,
      end_ms: 15_000,
      duration_ms: 5_000,
      created_by: 1,
    };
    vi.mocked(createSoundbite).mockResolvedValue(saved);
    renderModal({ start_ms: 10_000, end_ms: 15_000 });
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "  Decision " } });
    await act(async () => fireEvent.click(create()));
    expect(createSoundbite).toHaveBeenCalledWith(7, {
      start_ms: 10_000,
      end_ms: 15_000,
      title: "Decision",
    });
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(saved));
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps the modal open with the server's reason when it refuses", async () => {
    vi.mocked(createSoundbite).mockRejectedValue(
      new ApiError("SOUNDBITE_OUT_OF_RANGE", 422, "A soundbite must end within the recording"),
    );
    renderModal({ start_ms: 10_000, end_ms: 15_000 });
    await act(async () => fireEvent.click(create()));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "A soundbite must end within the recording",
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it.each([
    ["Cancel", () => fireEvent.click(screen.getByRole("button", { name: "Cancel" }))],
    ["Escape", () => fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })],
  ])("closing with %s stops a running preview", async (_how, close) => {
    renderModal({ start_ms: 10_000, end_ms: 15_000 });
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(engine.isPlaying).toBe(true);
    expect(screen.getByRole("button", { name: "Stop" })).toBeTruthy();
    act(close);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(engine.isPlaying).toBe(false);
  });
});
