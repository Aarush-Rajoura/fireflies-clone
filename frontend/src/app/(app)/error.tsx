"use client";

import { AlertCircle } from "lucide-react";

import { Button, EmptyState } from "@/components/ui";

/** Route-level boundary: a crash in one page keeps the shell usable. */
export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      icon={<AlertCircle strokeWidth={1.75} />}
      title="Something went wrong"
      description="This page hit an unexpected error. Try again, or pick another page from the sidebar."
      action={
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
      }
      className="py-24"
    />
  );
}
