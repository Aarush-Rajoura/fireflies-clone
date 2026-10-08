"use client";

import { FileText, ListChecks, Sparkles, TrendingUp } from "lucide-react";

import { EmptyState, StateView } from "@/components/ui";
import type { FeedItem } from "@/lib/api";
import { relativeTime } from "@/lib/utils/relative-time";

import { useFeed } from "../hooks/useFeed";

import { HomeRow } from "./HomeRow";

const KIND_ICON: Record<FeedItem["kind"], React.ReactNode> = {
  summary: <FileText strokeWidth={1.75} />,
  action_item: <ListChecks strokeWidth={1.75} />,
  trending: <TrendingUp strokeWidth={1.75} />,
};

/** Highlights from stored summaries, tasks and keywords (no AI call on read). */
export function AiFeedList() {
  const query = useFeed();
  return (
    <StateView
      query={query}
      isEmpty={(page) => page.items.length === 0}
      empty={
        <EmptyState
          icon={<Sparkles strokeWidth={1.75} />}
          title="Your AI feed is empty"
          description="Summaries, action items and trending topics from your meetings appear here."
        />
      }
    >
      {(page) => (
        <ul aria-label="AI feed" className="flex flex-col">
          {page.items.map((item, i) => (
            <HomeRow
              key={`${item.kind}-${item.meeting_id ?? "all"}-${i}`}
              href={item.meeting_id ? `/meetings/${item.meeting_id}` : "/meetings"}
              icon={KIND_ICON[item.kind]}
              title={item.title}
              meta={
                <>
                  <span className="text-secondary">{item.body}</span>
                  <span aria-hidden> · </span>
                  {relativeTime(item.created_at)}
                </>
              }
            />
          ))}
        </ul>
      )}
    </StateView>
  );
}
