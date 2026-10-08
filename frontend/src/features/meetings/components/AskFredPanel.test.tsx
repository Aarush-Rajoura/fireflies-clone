import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/components/ui";
import { makeQueryClient } from "@/lib/query/query-client";

import type { ScopedMeetingIds } from "../hooks/useScopedMeetingIds";
import { AskFredPanel } from "./AskFredPanel";

vi.mock("@/features/user", () => ({ useMe: () => ({ data: { name: "Nadia Brennan" } }) }));

function renderPanel(scope: ScopedMeetingIds) {
  return render(
    <QueryClientProvider client={makeQueryClient(() => undefined)}>
      <AppProviders>
        <AskFredPanel contextLabel="#product" scope={scope} />
      </AppProviders>
    </QueryClientProvider>,
  );
}

const answer = { answer: "Oct 21.", citations: [], provider: "mock", model: null };

describe("AskFredPanel", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the composer and chips disabled while the view's meetings load", () => {
    renderPanel({ status: "loading", meetingIds: undefined });
    const box = screen.getByRole("textbox", { name: "Ask Fred a question" }) as HTMLTextAreaElement;
    expect(box.disabled).toBe(true);
    expect(box.placeholder).toMatch(/Loading the meetings/);
    expect(
      (screen.getByRole("button", { name: "Key decisions" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("asks over exactly the view's meeting ids once they are loaded", async () => {
    const fetchMock = vi.fn<(req: Request) => Promise<Response>>(async () => Response.json(answer));
    vi.stubGlobal("fetch", fetchMock);
    renderPanel({ status: "ready", meetingIds: [4, 9] });

    await act(
      async () => void fireEvent.click(screen.getByRole("button", { name: "Key decisions" })),
    );
    const req = fetchMock.mock.calls[0]![0];
    expect(new URL(req.url).pathname).toBe("/api/v1/search/ask");
    expect(await req.json()).toEqual({
      question: "What were the key decisions?",
      meeting_ids: [4, 9],
    });
  });

  it("omits meeting_ids for All Meetings, so every meeting is searched", async () => {
    const fetchMock = vi.fn<(req: Request) => Promise<Response>>(async () => Response.json(answer));
    vi.stubGlobal("fetch", fetchMock);
    renderPanel({ status: "all", meetingIds: undefined });

    await act(
      async () => void fireEvent.click(screen.getByRole("button", { name: "My action items" })),
    );
    expect(await fetchMock.mock.calls[0]![0].json()).toEqual({
      question: "What are my action items?",
    });
  });
});
