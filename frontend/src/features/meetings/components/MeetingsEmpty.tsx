"use client";

import { Plus } from "lucide-react";

import { Button, EmptyState, SkeletonCardsIllustration } from "@/components/ui";
import { useComingSoon } from "@/features/shell";

import type { EmptyCopy } from "../lib/empty-copy";

export type MeetingsEmptyProps = {
  copy: EmptyCopy;
  onClearFilters: () => void;
};

/** The empty library, as in the reference, worded for the view that is empty. */
export function MeetingsEmpty({ copy, onClearFilters }: MeetingsEmptyProps) {
  const soon = useComingSoon();
  const capture = copy.kind === "first-run" || copy.kind === "hosted" || copy.kind === "uploads";

  const action =
    copy.kind === "filtered" ? (
      <Button onClick={onClearFilters}>Clear filters</Button>
    ) : capture ? (
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
    ) : undefined;

  return (
    <>
      <EmptyState
        illustration={<SkeletonCardsIllustration />}
        title={copy.title}
        description={copy.description}
        action={action}
      />
      {soon.dialog}
    </>
  );
}
