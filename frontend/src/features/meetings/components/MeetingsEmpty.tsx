"use client";

import { Plus } from "lucide-react";

import { Button, EmptyState, SkeletonCardsIllustration } from "@/components/ui";
import { useComingSoon } from "@/features/shell";

export type MeetingsEmptyProps = {
  /** True when a search or filter could be what is hiding meetings. */
  narrowed: boolean;
  onClearFilters: () => void;
};

/**
 * The empty library, as in the reference. When the view is narrowed the same
 * picture says so and offers the way back, instead of claiming nothing exists.
 */
export function MeetingsEmpty({ narrowed, onClearFilters }: MeetingsEmptyProps) {
  const soon = useComingSoon();
  if (narrowed) {
    return (
      <EmptyState
        illustration={<SkeletonCardsIllustration />}
        title="No meetings match this view"
        description="Try a different search, or clear the filters to see all your meetings."
        action={<Button onClick={onClearFilters}>Clear filters</Button>}
      />
    );
  }
  return (
    <>
      <EmptyState
        illustration={<SkeletonCardsIllustration />}
        title="Looks like you haven't recorded a meeting yet"
        description="Once you record your first meeting with Fireflies, it'll show up right here."
        action={
          <Button
            variant="primary"
            leadingIcon={<Plus strokeWidth={1.75} />}
            onClick={() =>
              soon.show({
                title: "Capture",
                message: "Recording and uploading meetings is coming soon.",
              })
            }
          >
            Capture
          </Button>
        }
      />
      {soon.dialog}
    </>
  );
}
