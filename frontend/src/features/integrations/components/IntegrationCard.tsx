import { Check, Plus } from "lucide-react";

import { Badge, Button } from "@/components/ui";
import type { Integration } from "@/lib/api";

import { IntegrationIcon } from "./IntegrationIcon";

export type IntegrationCardProps = {
  integration: Integration;
  onConnect: (integration: Integration) => void;
  onDisconnect: (integration: Integration) => void;
  /** True while this card's disconnect request is in flight. */
  busy?: boolean;
};

export function IntegrationCard({
  integration,
  onConnect,
  onDisconnect,
  busy,
}: IntegrationCardProps) {
  const { key, name, vendor, description, connected } = integration;
  return (
    <article
      aria-labelledby={`integration-${key}`}
      className="flex h-full flex-col gap-4 rounded-card border border-subtle bg-surface-1 p-6 transition-colors duration-fast hover:border-control"
    >
      <div className="flex items-start justify-between gap-3">
        <IntegrationIcon integrationKey={key} name={name} />
        {connected ? (
          <div className="flex items-center gap-2">
            <Badge tone="success" className="gap-1 normal-case">
              <Check className="size-3" strokeWidth={1.75} aria-hidden />
              Connected
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              loading={busy}
              aria-label={`Disconnect ${name}`}
              onClick={() => onDisconnect(integration)}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            leadingIcon={<Plus strokeWidth={1.75} />}
            aria-label={`Connect ${name}`}
            onClick={() => onConnect(integration)}
          >
            Connect
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 id={`integration-${key}`} className="text-title-row text-strong">
          {name}
        </h3>
        <p className="text-body text-muted">{vendor}</p>
      </div>
      <p className="line-clamp-3 text-body text-secondary" title={description}>
        {description}
      </p>
    </article>
  );
}
