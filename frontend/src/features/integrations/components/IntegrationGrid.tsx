"use client";

import type { ReactNode } from "react";

import { Skeleton, StateView, type QueryLike } from "@/components/ui";
import type { Integration } from "@/lib/api";

import { IntegrationCard } from "./IntegrationCard";

export type IntegrationGridProps = {
  query: QueryLike<Integration[]>;
  empty: ReactNode;
  onConnect: (integration: Integration) => void;
  onDisconnect: (integration: Integration) => void;
  /** Key of the integration whose disconnect is in flight. */
  busyKey?: string;
};

const gridClasses = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

function GridSkeleton() {
  return (
    <div className={gridClasses}>
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-[214px] rounded-card" />
      ))}
    </div>
  );
}

export function IntegrationGrid({
  query,
  empty,
  onConnect,
  onDisconnect,
  busyKey,
}: IntegrationGridProps) {
  return (
    <StateView
      query={query}
      isEmpty={(items) => items.length === 0}
      empty={empty}
      loading={<GridSkeleton />}
      errorMessage="The integration catalogue could not be loaded."
    >
      {(items) => (
        <ul className={gridClasses}>
          {items.map((integration) => (
            <li key={integration.key}>
              <IntegrationCard
                integration={integration}
                onConnect={onConnect}
                onDisconnect={onDisconnect}
                busy={busyKey === integration.key}
              />
            </li>
          ))}
        </ul>
      )}
    </StateView>
  );
}
