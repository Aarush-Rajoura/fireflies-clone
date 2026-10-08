"use client";

import { CalendarCog } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SegmentedControl } from "@/components/ui";

import { parseHomeTab, type HomeTab } from "../lib/tabs";

import { AiFeedList } from "./AiFeedList";
import { RecentList } from "./RecentList";
import { UpcomingList } from "./UpcomingList";

const OPTIONS = [
  { value: "recent", label: "Recent" },
  { value: "upcoming", label: "Upcoming" },
  { value: "ai-feed", label: "AI Feed" },
] as const satisfies readonly { value: HomeTab; label: string }[];

/**
 * Recent | Upcoming | AI Feed. The tab lives in `?tab=` so a notification can
 * link straight to Upcoming and Back restores the last tab.
 */
export function HomeTabs({ onSchedule }: { onSchedule: () => void }) {
  const tab = parseHomeTab(useSearchParams()?.get("tab"));
  const router = useRouter();
  const pathname = usePathname() ?? "/home";
  const select = (next: HomeTab) =>
    router.replace(next === "recent" ? pathname : `${pathname}?tab=${next}`, { scroll: false });

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <SegmentedControl
          label="Home lists"
          idPrefix="home-tab"
          options={OPTIONS}
          value={tab}
          onChange={select}
          className="h-10 [&>button]:h-8 [&>button]:text-lead"
        />
        <Link
          href="/settings"
          className="flex items-center gap-1.5 rounded-control px-1 text-lead-strong text-secondary hover:text-primary"
        >
          <CalendarCog className="size-4" strokeWidth={1.75} aria-hidden />
          Settings
        </Link>
      </div>
      <div role="tabpanel" aria-labelledby={`home-tab-${tab}`}>
        {tab === "recent" && <RecentList />}
        {tab === "upcoming" && <UpcomingList onSchedule={onSchedule} />}
        {tab === "ai-feed" && <AiFeedList />}
      </div>
    </section>
  );
}
