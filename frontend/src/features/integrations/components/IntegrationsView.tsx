"use client";

import { MessageCircle, PlugZap, SearchX } from "lucide-react";
import { useMemo, useState } from "react";

import { Button, EmptyState, TextButton, UnderlineTabs } from "@/components/ui";
import { useComingSoon } from "@/features/shell";
import type { Integration } from "@/lib/api";

import { useIntegrationCategories, useIntegrations } from "../hooks/useIntegrations";
import { useConnectIntegration, useDisconnectIntegration } from "../hooks/useIntegrationMutations";
import { useIntegrationsParams } from "../hooks/useIntegrationsParams";
import { PAGE_SIZE, type IntegrationsTab } from "../lib/params";

import { CategoryChips } from "./CategoryChips";
import { ConnectModal } from "./ConnectModal";
import { FeaturedCarousel } from "./FeaturedCarousel";
import { IntegrationGrid } from "./IntegrationGrid";
import { SearchBox } from "./SearchBox";

const TABS = [
  { value: "discover", label: "Discover" },
  { value: "connected", label: "Connected" },
] as const satisfies readonly { value: IntegrationsTab; label: string }[];

const PANEL_ID = "integrations-tab";

/** The integrations catalogue: Discover (featured, filters, grid) and Connected. */
export function IntegrationsView() {
  const { params, query, setTab, setCategory, setSearch } = useIntegrationsParams();
  const list = useIntegrations(query);
  // The unfiltered catalogue backs the carousel's connect buttons whatever the grid shows.
  const catalogue = useIntegrations({ page_size: PAGE_SIZE });
  const categories = useIntegrationCategories();
  const connect = useConnectIntegration();
  const disconnect = useDisconnectIntegration();
  const [pending, setPending] = useState<Integration | null>(null);
  const soon = useComingSoon();

  const byKey = useMemo(
    () => new Map((catalogue.data ?? []).map((i) => [i.key, i] as const)),
    [catalogue.data],
  );
  const filtered = params.category !== undefined || params.q !== undefined;

  const confirmConnect = () => {
    if (!pending) return;
    connect.mutate(pending, { onSuccess: () => setPending(null) });
  };
  const onDisconnect = (integration: Integration) => disconnect.mutate(integration);
  const busyKey = disconnect.isPending ? disconnect.variables?.key : undefined;

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-topbar border-b border-subtle bg-surface-0">
        <UnderlineTabs
          tabs={TABS}
          value={params.tab}
          onChange={setTab}
          label="Integrations"
          idPrefix={PANEL_ID}
        />
      </div>

      <div id={`${PANEL_ID}-panel`} role="tabpanel" aria-labelledby={`${PANEL_ID}-${params.tab}`}>
        {params.tab === "discover" ? (
          <>
            <FeaturedCarousel byKey={byKey} onConnect={setPending} onBrowse={setCategory} />
            <section
              aria-label="All integrations"
              className="mx-auto w-full max-w-[1240px] px-6 pb-16 pt-14"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <CategoryChips
                  categories={categories.data ?? []}
                  value={params.category}
                  onChange={setCategory}
                />
                <SearchBox value={params.q ?? ""} onSearch={setSearch} className="lg:w-[350px]" />
              </div>
              <TextButton
                tone="plain"
                className="mb-5 mt-6 inline-flex items-center gap-1.5 px-1 text-body text-secondary hover:text-primary"
                onClick={() =>
                  soon.show({
                    title: "Share feedback",
                    message: "Feedback on integrations is not collected in this demo yet.",
                  })
                }
              >
                <MessageCircle className="size-4" strokeWidth={1.75} aria-hidden />
                Share Feedback
              </TextButton>
              <IntegrationGrid
                query={list}
                onConnect={setPending}
                onDisconnect={onDisconnect}
                busyKey={busyKey}
                empty={
                  <EmptyState
                    icon={<SearchX strokeWidth={1.75} />}
                    title="No integrations match"
                    description={filtered ? "Try another category or search term." : undefined}
                    action={
                      filtered && (
                        <Button
                          onClick={() => {
                            setCategory(undefined);
                            setSearch("");
                          }}
                        >
                          Clear filters
                        </Button>
                      )
                    }
                  />
                }
              />
            </section>
          </>
        ) : (
          <section
            aria-label="Connected integrations"
            className="mx-auto w-full max-w-[1240px] px-6 py-10"
          >
            <IntegrationGrid
              query={list}
              onConnect={setPending}
              onDisconnect={onDisconnect}
              busyKey={busyKey}
              empty={
                <EmptyState
                  icon={<PlugZap strokeWidth={1.75} />}
                  title="No integrations connected yet"
                  description="Connected integrations appear here. Connections in this demo are simulated."
                  action={
                    <Button variant="primary" onClick={() => setTab("discover")}>
                      Discover integrations
                    </Button>
                  }
                />
              }
            />
          </section>
        )}
      </div>

      <ConnectModal
        integration={pending}
        onClose={() => setPending(null)}
        onConfirm={confirmConnect}
        loading={connect.isPending}
      />
      {soon.dialog}
    </div>
  );
}
