"use client";

import { ShieldCheck } from "lucide-react";

import { Button, Modal } from "@/components/ui";
import type { Integration } from "@/lib/api";

import { IntegrationIcon } from "./IntegrationIcon";

export type ConnectModalProps = {
  /** The integration being connected; null closes the modal. */
  integration: Pick<Integration, "key" | "name" | "vendor" | "description"> | null;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
};

/** Makes the simulation explicit before anything is "connected": no real OAuth, no data sent. */
export function ConnectModal({ integration, onClose, onConfirm, loading }: ConnectModalProps) {
  return (
    <Modal
      open={integration !== null}
      onOpenChange={(open) => !open && onClose()}
      title={integration ? `Connect ${integration.name}` : "Connect"}
      size="sm"
      dismissible={!loading}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} loading={loading}>
            Connect
          </Button>
        </>
      }
    >
      {integration && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <IntegrationIcon integrationKey={integration.key} name={integration.name} />
            <div className="min-w-0">
              <p className="text-body-strong text-strong">{integration.name}</p>
              <p className="text-meta text-muted">{integration.vendor}</p>
            </div>
          </div>
          <p className="text-body text-secondary">{integration.description}</p>
          <div className="flex items-start gap-2.5 rounded-panel border border-accent-border bg-accent-faint p-3">
            <ShieldCheck
              className="mt-0.5 size-4 shrink-0 text-accent"
              strokeWidth={1.75}
              aria-hidden
            />
            <p className="text-meta text-primary">
              <span className="font-semibold text-strong">
                Demo connection — no data leaves this app.
              </span>{" "}
              Connecting only marks {integration.name} as connected here; you can disconnect at any
              time.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
