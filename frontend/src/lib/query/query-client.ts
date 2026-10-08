import { MutationCache, QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api";

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: Error;
    /** A mutation that renders its own failure sets `meta: { silent: true }`. */
    mutationMeta: { silent?: boolean };
  }
}

const GENERIC_FAILURE = "Something went wrong. Please try again.";

/** Network and server failures may pass on a second try; 4xx answers never change. */
export function isRetryable(error: unknown): boolean {
  return error instanceof ApiError ? error.isRetryable : false;
}

export function shouldRetry(failureCount: number, error: unknown): boolean {
  return failureCount < 1 && isRetryable(error);
}

type ErrorNotifier = (message: string, retry?: () => void) => void;

/**
 * Built per browser session by app/providers.tsx. The notifier is injected so
 * this module never knows how errors are shown.
 */
export function makeQueryClient(notifyError: ErrorNotifier): QueryClient {
  return new QueryClient({
    // No mutation fails silently: a default, because forgetting it is invisible.
    mutationCache: new MutationCache({
      onError: (error, variables, _context, mutation) => {
        if (mutation.meta?.silent) return;
        const message =
          error instanceof ApiError && error.message ? error.message : GENERIC_FAILURE;
        const retry = isRetryable(error) ? () => void mutation.execute(variables) : undefined;
        notifyError(message, retry);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
      mutations: { retry: false },
    },
  });
}
