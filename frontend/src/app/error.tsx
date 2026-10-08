"use client";

import { AlertCircle } from "lucide-react";

import { Button, EmptyState } from "@/components/ui";

/** Root boundary for the marketing, auth and dev routes; the app shell has its own. */
export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      icon={<AlertCircle strokeWidth={1.75} />}
      title="Something went wrong"
      description="This page hit an unexpected error. Try again."
      action={
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
      }
      className="py-24"
    />
  );
}
