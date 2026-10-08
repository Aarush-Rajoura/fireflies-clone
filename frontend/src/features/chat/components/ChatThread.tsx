"use client";

import { AlertCircle, MessageSquareOff } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button, EmptyState, Skeleton } from "@/components/ui";
import { ApiError } from "@/lib/api";

import { useChat } from "../hooks/useChats";
import { useSendMessage } from "../hooks/useSendMessage";
import { Conversation } from "./Conversation";

/** A saved chat: its history, plus follow-ups that appear as soon as they are sent. */
export function ChatThread({ chatId }: { chatId: number }) {
  const chat = useChat(chatId);
  const send = useSendMessage(chatId);
  const router = useRouter();

  if (chat.isPending) {
    return (
      <div
        role="status"
        aria-label="Loading chat"
        className="mx-auto flex w-full max-w-[770px] flex-col gap-4 px-6 py-8"
      >
        <Skeleton className="h-10 w-1/2 self-end" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }
  if (chat.isError) {
    if (chat.error instanceof ApiError && chat.error.status === 404) {
      return (
        <EmptyState
          icon={<MessageSquareOff strokeWidth={1.75} />}
          title="This chat no longer exists"
          description="It may have been deleted."
          action={
            <Button variant="primary" onClick={() => router.push("/askfred")}>
              Start a new chat
            </Button>
          }
        />
      );
    }
    return (
      <EmptyState
        icon={<AlertCircle strokeWidth={1.75} />}
        title="Couldn't load this chat"
        description="Something went wrong while loading it."
        action={<Button onClick={() => chat.refetch()}>Try again</Button>}
      />
    );
  }

  return (
    <Conversation
      messages={chat.data.messages}
      pending={send.isPending}
      failure={send.isError ? { error: send.error, body: send.variables } : null}
      onSend={(body) => {
        if (send.isPending) return false;
        send.mutate(body);
        return true;
      }}
    />
  );
}
