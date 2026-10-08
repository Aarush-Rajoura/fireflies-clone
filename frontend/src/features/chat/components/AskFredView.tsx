"use client";

import { useRouter } from "next/navigation";

import type { ChatMessageCreate } from "@/lib/api";

import { optimisticUserMessage, useCreateChat } from "../hooks/useSendMessage";
import { ChatHome } from "./ChatHome";
import { ChatSidebar } from "./ChatSidebar";
import { ChatThread } from "./ChatThread";
import { Conversation } from "./Conversation";

export type AskFredViewProps = {
  /** The open chat; absent on the new-chat screen. */
  chatId?: number;
};

/**
 * The AskFred page. A new chat's first question is shown straight away; the
 * thread only exists once it is answered, so the URL moves to it then.
 */
export function AskFredView({ chatId }: AskFredViewProps) {
  const router = useRouter();
  const create = useCreateChat();

  const start = (body: ChatMessageCreate) => {
    if (create.isPending) return false;
    create.mutate(body, {
      onSuccess: (exchange) => router.push(`/askfred/${exchange.thread.id}`),
    });
    return true;
  };

  const newChat = () => {
    create.reset();
    router.push("/askfred");
  };

  let main;
  if (chatId !== undefined) {
    main = <ChatThread chatId={chatId} />;
  } else if (create.isIdle) {
    main = <ChatHome onSend={start} pending={false} />;
  } else {
    // Pending, failed, or answered and about to navigate: keep the question on screen.
    const question = create.variables?.question ?? "";
    main = (
      <Conversation
        messages={create.isError ? [] : [optimisticUserMessage(question)]}
        pending={!create.isError}
        failure={create.isError ? { error: create.error, body: create.variables } : null}
        onSend={start}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <ChatSidebar activeId={chatId} onNewChat={newChat} />
      <div className="min-w-0 flex-1">{main}</div>
    </div>
  );
}
