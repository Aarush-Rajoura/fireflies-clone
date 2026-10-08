"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Skeleton, StateView } from "@/components/ui";
import type { Team } from "@/lib/api";

import { useMyTeam } from "../hooks/useTeam";
import { canManageTeam } from "../lib/members";

import { CreateTeamForm } from "./CreateTeamForm";
import { InviteModal } from "./InviteModal";
import { MembersTable } from "./MembersTable";
import { TeamHeader } from "./TeamHeader";

export type TeamViewProps = {
  /** `/team?invite=1` (the rail's Invite icon) opens the invite dialog on arrival. */
  inviteRequested?: boolean;
};

export function TeamView({ inviteRequested = false }: TeamViewProps) {
  const query = useMyTeam();
  return (
    <section className="mx-auto flex w-full max-w-content flex-col gap-6 px-6 py-8">
      <StateView
        query={query}
        isEmpty={(team) => team === null}
        empty={<CreateTeamForm />}
        loading={<Skeleton className="h-64 w-full" />}
        errorMessage="We couldn't load your team."
      >
        {(team) => team && <TeamDetail team={team} inviteRequested={inviteRequested} />}
      </StateView>
    </section>
  );
}

function TeamDetail({ team, inviteRequested }: { team: Team; inviteRequested: boolean }) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const manager = canManageTeam(team.my_role);

  // Derived, not synced in an effect: the URL flag opens it, closing clears the flag.
  const open = manager && (inviteOpen || inviteRequested);
  const onOpenChange = (next: boolean) => {
    setInviteOpen(next);
    if (!next && inviteRequested) router.replace("/team", { scroll: false });
  };

  return (
    <>
      <TeamHeader team={team} onInvite={() => setInviteOpen(true)} />
      <MembersTable team={team} />
      {manager && <InviteModal teamId={team.id} open={open} onOpenChange={onOpenChange} />}
    </>
  );
}
