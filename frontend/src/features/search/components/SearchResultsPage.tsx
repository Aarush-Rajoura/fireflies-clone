"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Pagination, SkeletonRow, StateView } from "@/components/ui";
import type { SearchHit } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

import { useSearch } from "../hooks/useSearch";
import { groupByMeeting, hitHref, type MeetingHits } from "../lib/group";
import { HitSnippet } from "./HitSnippet";
import { SearchEmpty } from "./SearchEmpty";

export const RESULTS_PAGE_SIZE = 50;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "es"}`;

function MeetingGroup({ group }: { group: MeetingHits }) {
  return (
    <section
      aria-labelledby={`search-meeting-${group.meetingId}`}
      className="overflow-hidden rounded-card border border-subtle bg-surface-1"
    >
      <header className="flex items-baseline justify-between gap-4 border-b border-subtle px-5 py-3">
        <Link
          id={`search-meeting-${group.meetingId}`}
          href={`/meetings/${group.meetingId}`}
          className="truncate text-title-row text-strong hover:text-accent"
        >
          {group.title}
        </Link>
        <span className="tnum shrink-0 text-meta text-muted">
          {plural(group.hits.length, "match")}
        </span>
      </header>
      <ul className="divide-y divide-subtle">
        {group.hits.map((hit) => (
          <li key={hit.segment_id}>
            <Link
              href={hitHref(hit)}
              className="block px-5 py-3 transition-colors duration-fast hover:bg-surface-hover focus-visible:bg-surface-hover"
            >
              <HitSnippet hit={hit} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The full `/search?q=` results: every hit on the page, grouped by meeting
 * (best-matching meeting first). `q` and `page` live in the URL so results
 * are shareable and Back works.
 *
 * The API pages flat hits, not meetings, so grouping is per page: a meeting
 * whose hits straddle a page boundary appears on both pages, each group
 * showing only that page's hits.
 */
export function SearchResultsPage({ q, page = 1 }: { q: string; page?: number }) {
  const router = useRouter();
  const query = q.trim();
  const search = useSearch(query, { page, pageSize: RESULTS_PAGE_SIZE, debounceMs: 0 });

  const setPage = (next: number) => {
    const params = new URLSearchParams({ q: query });
    if (next > 1) params.set("page", String(next));
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto flex w-full max-w-content flex-1 flex-col gap-4 px-6 py-6">
        {query ? (
          <StateView
            query={search}
            isEmpty={(data) => data.items.length === 0}
            empty={<SearchEmpty q={query} />}
            errorMessage="Search failed. Check your connection and try again."
            loading={Array.from({ length: 4 }, (_, i) => (
              <SkeletonRow key={i} />
            ))}
          >
            {(data) => (
              <>
                <p className="tnum text-meta text-muted" aria-live="polite">
                  {plural(data.total, "match")} for “{query}”
                </p>
                <ResultGroups hits={data.items} stale={search.isStale} />
              </>
            )}
          </StateView>
        ) : (
          <SearchEmpty q="" />
        )}
      </div>
      {search.data && query && (
        <Pagination
          page={search.data.page}
          pageSize={search.data.page_size}
          itemCount={search.data.items.length}
          total={search.data.total}
          totalPages={search.data.total_pages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

/** While the next query or page loads, the old hits stay visible but inert so nobody opens a stale result. */
function ResultGroups({ hits, stale }: { hits: SearchHit[]; stale: boolean }) {
  return (
    <div
      aria-busy={stale}
      inert={stale}
      className={cn("flex flex-col gap-4 transition-opacity", stale && "opacity-60")}
    >
      {groupByMeeting(hits).map((group) => (
        <MeetingGroup key={group.meetingId} group={group} />
      ))}
    </div>
  );
}
