"use client";

import { Layers, MessageSquare, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDialog, IconButton, NavItem, SearchInput, Skeleton, Button } from "@/components/ui";
import type { ChatThread } from "@/lib/api";

import { useChats, useDeleteChat } from "../hooks/useChats";
import { groupByDay } from "../lib/history";

export type ChatSidebarProps = {
  activeId?: number;
  onNewChat: () => void;
};

/** AskFred's left column: New Chat, Search, Connectors, then the chat history by day. */
export function ChatSidebar({ activeId, onNewChat }: ChatSidebarProps) {
  const router = useRouter();
  const [searching, setSearching] = useState(false);
  const [filter, setFilter] = useState("");
  const [deleting, setDeleting] = useState<ChatThread | null>(null);
  const chats = useChats(filter);
  const remove = useDeleteChat();
  const threads = chats.data?.items ?? [];

  const confirmDelete = () => {
    if (!deleting) return;
    const id = deleting.id;
    remove.mutate(id, {
      onSuccess: () => {
        setDeleting(null);
        if (id === activeId) router.push("/askfred");
      },
    });
  };

  return (
    <aside
      aria-label="AskFred chats"
      className="flex w-sidebar shrink-0 flex-col overflow-y-auto border-r border-subtle bg-surface-1"
    >
      <nav aria-label="AskFred" className="flex flex-col gap-1 px-6 pb-4 pt-6">
        <NavItem
          label="New Chat"
          icon={<Plus strokeWidth={1.75} />}
          onClick={onNewChat}
          className="text-primary"
        />
        <NavItem
          label="Search"
          icon={<Search strokeWidth={1.75} />}
          active={searching}
          aria-expanded={searching}
          onClick={() => {
            setSearching((open) => !open);
            setFilter("");
          }}
          className={searching ? undefined : "text-primary"}
        />
        {searching && (
          <div className="px-1 py-1">
            <SearchInput
              label="Search chats"
              placeholder="Search chats"
              value={filter}
              onValueChange={setFilter}
              debounceMs={0}
              autoFocus
            />
          </div>
        )}
        <NavItem
          label="Connectors"
          icon={<Layers strokeWidth={1.75} />}
          onClick={() => router.push("/integrations")}
          className="text-primary"
        />
      </nav>

      <section aria-label="Chat history" className="flex flex-1 flex-col px-6 pb-6">
        {chats.isPending ? (
          <div role="status" aria-label="Loading chats" className="flex flex-col gap-3 px-3 pt-4">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : chats.isError ? (
          <p className="px-3 pt-4 text-meta text-muted">
            Couldn&apos;t load chats.{" "}
            <Button variant="ghost" size="sm" onClick={() => chats.refetch()}>
              Retry
            </Button>
          </p>
        ) : threads.length === 0 && filter.trim() ? (
          <p className="px-3 pt-4 text-meta text-muted">No chats match “{filter.trim()}”.</p>
        ) : threads.length === 0 ? (
          <NoChats />
        ) : (
          groupByDay(threads).map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5 pt-4">
              <h3 className="px-3 pb-1.5 text-label text-muted">{group.label}</h3>
              <ul className="flex flex-col gap-0.5">
                {group.threads.map((thread) => (
                  <li key={thread.id} className="group relative flex items-center">
                    <NavItem
                      label={thread.title}
                      icon={<MessageSquare strokeWidth={1.75} />}
                      active={thread.id === activeId}
                      onClick={() => router.push(`/askfred/${thread.id}`)}
                      className="h-10 pr-10"
                    />
                    <span className="absolute right-1.5 opacity-0 transition-opacity duration-fast focus-within:opacity-100 group-hover:opacity-100">
                      <IconButton
                        label={`Delete “${thread.title}”`}
                        tooltip={false}
                        size="sm"
                        icon={<Trash2 strokeWidth={1.75} />}
                        onClick={() => setDeleting(thread)}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && !remove.isPending && setDeleting(null)}
        title="Delete this chat?"
        description={
          deleting ? `“${deleting.title}” and all its messages will be deleted.` : undefined
        }
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </aside>
  );
}

/** The empty history, as in the product: two placeholder bars over a short explanation. */
function NoChats() {
  return (
    <div className="flex flex-col items-center px-3 pt-8 text-center">
      <div aria-hidden className="flex w-full flex-col items-end gap-4 pb-9">
        <span className="h-6 w-[150px] rounded-item bg-accent-subtle" />
        <span className="h-12 w-[230px] rounded-item bg-surface-3" />
      </div>
      <p className="text-body-strong text-strong">No chats yet</p>
      <p className="pt-2 text-body text-secondary">
        Your chats will appear here once you start one.
      </p>
    </div>
  );
}
