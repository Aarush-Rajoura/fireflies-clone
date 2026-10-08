import { MutationCache, QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api";

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: Error;
    mutationMeta: MutationErrorMeta;
  }
}

/**
 * How a mutation's failure is reported by the global handler.
 *
 * - `errorToast: false`: the global toast is skipped; the feature shows its own.
 * - `retryable`: force the Retry action on (`true`) or off (`false`); by
 *   default it is offered only for network/5xx/429 errors.
 *
 * The global Retry calls `mutation.execute(variables)` from the cache, outside
 * any component: the mutationFn and hook-level options (`useMutation({ onSuccess })`)
 * run again, but per-call callbacks (`mutate(vars, { onSuccess })`) do not.
 * A feature that relies on per-call callbacks (optimistic rollback, navigation)
 * sets `errorToast: false` and renders its own toast with its own retry.
 */
export type MutationErrorMeta = { errorToast?: false; retryable?: boolean };

const GENERIC_FAILURE = "Something went wrong. Please try again.";

/**
 * Network, 5xx and 429 (AI rate limit) failures may pass on a second try; other
 * 4xx answers never change. Queries retry such errors once.
 */
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
        const meta = mutation.meta;
        if (meta?.errorToast === false) return;
        const message =
          error instanceof ApiError && error.message ? error.message : GENERIC_FAILURE;
        const offerRetry = meta?.retryable ?? isRetryable(error);
        // A failed retry reports itself through this same handler, so its rejection is dropped here.
        const retry = offerRetry
          ? () => void mutation.execute(variables).catch(() => undefined)
          : undefined;
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
