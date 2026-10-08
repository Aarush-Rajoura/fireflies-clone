"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui";
import { qk, type Integration, type Page } from "@/lib/api";

import { connectIntegration, disconnectIntegration } from "../api";

/** Patches the card everywhere it is cached so every grid flips at once, before the refetch. */
function patchCached(client: QueryClient, key: string, connectedAt: string | null) {
  client.setQueriesData<Page<Integration>>({ queryKey: qk.integrations.all }, (page) =>
    page && "items" in page
      ? {
          ...page,
          items: page.items.map((i) =>
            i.key === key
              ? { ...i, connected: connectedAt !== null, connected_at: connectedAt }
              : i,
          ),
        }
      : page,
  );
}

/** The Connected tab's membership changes, so its list is refetched rather than patched. */
function refresh(client: QueryClient) {
  return client.invalidateQueries({ queryKey: qk.integrations.all });
}

export function useConnectIntegration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (integration: Pick<Integration, "key" | "name">) =>
      connectIntegration(integration.key),
    onSuccess: async (connected) => {
      patchCached(client, connected.key, connected.connected_at);
      toast.success(`${connected.name} connected (demo)`);
      await refresh(client);
    },
  });
}

export function useDisconnectIntegration() {
  const client = useQueryClient();
  const connect = useConnectIntegration();
  return useMutation({
    mutationFn: async (integration: Pick<Integration, "key" | "name">) => {
      await disconnectIntegration(integration.key);
      return integration;
    },
    onSuccess: async (integration) => {
      patchCached(client, integration.key, null);
      toast.success(`${integration.name} disconnected`, {
        label: "Undo",
        onClick: () => connect.mutate(integration),
      });
      await refresh(client);
    },
  });
}
