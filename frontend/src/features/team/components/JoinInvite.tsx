"use client";

import { MailCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button, EmptyState } from "@/components/ui";
import { ApiError } from "@/lib/api";

import { useAcceptInvite } from "../hooks/useTeamMutations";

function errorCopy(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "INVITE_NOT_FOUND") {
      return "This invite link is invalid or has expired. Ask your teammate for a new one.";
    }
    if (error.code === "TEAM_EXISTS") return "You already belong to another team.";
  }
  return "We couldn't accept this invite. Try again.";
}

/** Landing page for a copied invite link. Joining is a click, never a side effect of render. */
export function JoinInvite({ token }: { token: string }) {
  const router = useRouter();
  const accept = useAcceptInvite();

  const submit = () => accept.mutate(token, { onSuccess: () => router.push("/team") });

  if (accept.isSuccess) {
    return (
      <EmptyState
        icon={<MailCheck strokeWidth={1.75} />}
        title="You're in"
        description="Taking you to your team…"
      />
    );
  }

  return (
    <EmptyState
      icon={<Users strokeWidth={1.75} />}
      title="You've been invited to join a team"
      description="Accept to share meetings, notes and recaps with your new teammates. Demo only: no email was sent."
      action={
        <div className="flex flex-col items-center gap-3">
          <Button variant="primary" onClick={submit} loading={accept.isPending}>
            Accept invite
          </Button>
          {accept.isError && (
            <p role="alert" className="text-caption text-danger-strong">
              {errorCopy(accept.error)}
            </p>
          )}
        </div>
      }
    />
  );
}
