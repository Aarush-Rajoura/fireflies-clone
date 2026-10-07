"use client";

import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "./button";
import { EmptyState } from "./empty-state";
import { SkeletonRow } from "./skeleton";

export type QueryLike<T> = {
  isLoading: boolean;
  isError: boolean;
  data?: T;
  refetch(): void;
};

export type StateViewProps<T> = {
  query: QueryLike<T>;
  isEmpty(data: T): boolean;
  empty: ReactNode;
  children(data: T): ReactNode;
  loading?: ReactNode;
  errorMessage?: string;
};

/** One switch for loading / error / empty / data so every list handles all four. */
export function StateView<T>({
  query,
  isEmpty,
  empty,
  children,
  loading,
  errorMessage = "Something went wrong while loading this.",
}: StateViewProps<T>) {
  if (query.isLoading) {
    return (
      <div role="status" aria-label="Loading">
        {loading ?? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        )}
      </div>
    );
  }
  if (query.isError || query.data === undefined) {
    return (
      <EmptyState
        icon={<AlertCircle strokeWidth={1.75} />}
        title="Couldn't load"
        description={errorMessage}
        action={
          <Button variant="secondary" onClick={() => query.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }
  if (isEmpty(query.data)) return <>{empty}</>;
  return <>{children(query.data)}</>;
}
