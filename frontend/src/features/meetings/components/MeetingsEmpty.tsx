"use client";

import { Plus } from "lucide-react";

import { Button, EmptyState, SkeletonCardsIllustration } from "@/components/ui";
import { openCreateMeeting } from "@/features/create";

import type { EmptyCopy } from "../lib/empty-copy";

export type MeetingsEmptyProps = {
  copy: EmptyCopy;
  onClearFilters: () => void;
};

/** The empty library, as in Fireflies, worded for the view that is empty. */
export function MeetingsEmpty({ copy, onClearFilters }: MeetingsEmptyProps) {
  const capture = copy.kind === "first-run" || copy.kind === "hosted" || copy.kind === "uploads";

  const action =
    copy.kind === "filtered" ? (
      <Button onClick={onClearFilters}>Clear filters</Button>
    ) : capture ? (
      <Button
        variant="primary"
        leadingIcon={<Plus strokeWidth={1.75} />}
        onClick={() => openCreateMeeting("upload")}
      >
        Capture
      </Button>
    ) : undefined;

  return (
    <EmptyState
      illustration={<SkeletonCardsIllustration />}
      title={copy.title}
      description={copy.description}
      action={action}
    />
  );
}
