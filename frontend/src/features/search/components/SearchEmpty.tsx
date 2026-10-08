import { SearchX, Search } from "lucide-react";

import { EmptyState, Kbd } from "@/components/ui";

/** No query yet, or a query with no transcript matches. */
export function SearchEmpty({ q }: { q: string }) {
  if (!q) {
    return (
      <EmptyState
        icon={<Search strokeWidth={1.75} />}
        title="Search across all meetings"
        description={
          <>
            Find any word said in any transcript. Press <Kbd keys={["Ctrl", "K"]} /> to search from
            anywhere.
          </>
        }
      />
    );
  }
  return (
    <EmptyState
      icon={<SearchX strokeWidth={1.75} />}
      title={`No results for “${q}”`}
      description="Try fewer or different words. Search matches what was said in transcripts."
    />
  );
}
