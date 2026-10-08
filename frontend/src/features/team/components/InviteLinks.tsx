"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Badge, Button, toast } from "@/components/ui";
import type { TeamMember } from "@/lib/api";

import { useAcceptInvite } from "../hooks/useTeamMutations";
import { absoluteInviteUrl, tokenFromInviteUrl } from "../lib/members";

/** Copyable invite links, each with a demo "accept" that stands in for the invitee. */
export function InviteLinks({ invites }: { invites: TeamMember[] }) {
  // Only ever rendered after a user action (inside a dialog), so window exists.
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <ul aria-label="Invite links" className="flex flex-col gap-2">
      {invites.map((m) =>
        m.invite_url ? (
          <InviteLinkRow
            key={m.id}
            email={m.email}
            path={m.invite_url}
            url={origin ? absoluteInviteUrl(m.invite_url, origin) : m.invite_url}
          />
        ) : null,
      )}
    </ul>
  );
}

function InviteLinkRow({ email, url, path }: { email: string; url: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const accept = useAcceptInvite();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(`Invite link for ${email} copied`);
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  return (
    <li className="flex flex-col gap-2 rounded-panel border border-subtle bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-body-strong text-primary">{email}</span>
        {accept.isSuccess && <Badge tone="success">Active</Badge>}
      </div>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-control bg-surface-sunken px-2 py-1.5 text-meta text-secondary">
          {url}
        </code>
        <Button
          size="sm"
          leadingIcon={copied ? <Check strokeWidth={1.75} /> : <Copy strokeWidth={1.75} />}
          onClick={copy}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={accept.isSuccess}
          loading={accept.isPending}
          onClick={() =>
            accept.mutate(tokenFromInviteUrl(path), {
              onSuccess: () => toast.success(`${email} joined the team`),
              onError: (e) => toast.error(e.message || "Couldn't accept the invite"),
            })
          }
        >
          Accept (demo)
        </Button>
      </div>
    </li>
  );
}
