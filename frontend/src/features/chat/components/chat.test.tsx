import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui";
import type { ChatCitation, ChatMessage } from "@/lib/api";

import { ChatHome } from "./ChatHome";
import { Composer } from "./Composer";
import { MessageItem } from "./MessageItem";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/features/user", () => ({
  useMe: () => ({ data: { id: 1, name: "Nadia Brennan", email: "n@x.io" } }),
}));
vi.mock("../api", () => ({
  fetchChatSkills: vi.fn(async () => []),
  searchMeetingsForContext: vi.fn(async () => []),
}));

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("ChatHome", () => {
  it("greets the user and runs each suggested prompt as its skill", () => {
    const onSend = vi.fn(() => true);
    wrap(<ChatHome onSend={onSend} pending={false} />);
    expect(
      screen.getByRole("heading", { name: "Hi Nadia Brennan, how can I help today?" }),
    ).toBeTruthy();
    const prompts = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(prompts).toEqual([
      "List my action items & todos for this week",
      "Summarize my last meeting",
      "Prepare me for the upcoming meeting",
      "Connect Gmail, Notion, and 30+ sources for richer insights.",
      "Prepare weekly digest, based on my meetings",
    ]);
    fireEvent.click(
      screen.getByRole("button", { name: "Prepare weekly digest, based on my meetings" }),
    );
    expect(onSend).toHaveBeenCalledWith({
      question: "Prepare weekly digest, based on my meetings",
      skill: "digest",
    });
    fireEvent.click(screen.getByRole("button", { name: /Connect Gmail/ }));
    expect(push).toHaveBeenCalledWith("/integrations");
    expect(screen.getByText("Consumes AI credits")).toBeTruthy();
  });
});

describe("Composer", () => {
  it("sends on Enter, breaks lines on Shift+Enter and ignores IME composition", () => {
    const onSubmit = vi.fn(() => true);
    wrap(<Composer onSubmit={onSubmit} />);
    const box = screen.getByRole("combobox", { name: "Ask AskFred" }) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "What did we decide?" } });
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    fireEvent.keyDown(box, { key: "Enter", isComposing: true });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith({ question: "What did we decide?" });
    expect(box.value).toBe("");
  });

  it("keeps the draft when the send is refused", () => {
    wrap(<Composer onSubmit={() => false} />);
    const box = screen.getByRole("combobox", { name: "Ask AskFred" }) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "hello" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(box.value).toBe("hello");
  });
});

const citation: ChatCitation = {
  id: 9,
  meeting_id: 3,
  meeting_title: "Launch Go/No-Go",
  segment_id: 41,
  start_ms: 75_000,
  quote: "We go on the 21st",
};

const message = (content: string): ChatMessage => ({
  id: 1,
  role: "assistant",
  content,
  skill: "summarize",
  provider: null,
  model: null,
  created_at: "2030-01-10T10:00:00Z",
  citations: [citation],
});

describe("MessageItem", () => {
  it("renders markdown-lite with citation links in seconds, never raw HTML", () => {
    const { container } = wrap(
      <MessageItem message={message("## Launch\n- **Go** on the 21st [1]\n<b>not bold</b>")} />,
    );
    expect(screen.getByRole("heading", { name: "Launch" })).toBeTruthy();
    expect(container.querySelector("strong")?.textContent).toBe("Go");
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByText("<b>not bold</b>")).toBeTruthy();
    const marker = screen.getByRole("link", { name: "Source 1: Launch Go/No-Go" });
    expect(marker.getAttribute("href")).toBe("/meetings/3?t=75");
    const source = screen.getByRole("link", { name: /^Source 1: Launch Go\/No-Go at/ });
    expect(source.getAttribute("href")).toBe("/meetings/3?t=75");
  });
});
