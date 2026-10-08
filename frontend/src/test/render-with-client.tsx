import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";

import { AppProviders } from "@/components/ui";
import { makeQueryClient } from "@/lib/query/query-client";

/** Renders inside a fresh query client and the UI providers, as the app layouts do. */
export function renderWithClient(ui: ReactElement) {
  const client = makeQueryClient(() => undefined);
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <AppProviders>{ui}</AppProviders>
      </QueryClientProvider>,
    ),
  };
}
