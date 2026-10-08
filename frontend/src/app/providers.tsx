"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { AppProviders, toast } from "@/components/ui";
import { makeQueryClient } from "@/lib/query/query-client";

/**
 * Composition root for the signed-in app: the one place app-wide singletons
 * (query client, theme scope, tooltip provider, toaster) are created.
 */
export function Providers({ children }: { children: ReactNode }) {
  // useState, not a module constant: one client per browser session, never shared across SSR requests.
  const [client] = useState(() =>
    makeQueryClient((message, retry) => toast.error(message, { retry })),
  );
  return (
    <QueryClientProvider client={client}>
      <AppProviders>{children}</AppProviders>
    </QueryClientProvider>
  );
}
