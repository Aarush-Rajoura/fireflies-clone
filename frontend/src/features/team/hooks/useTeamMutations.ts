"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui";
import { qk, type Team, type TeamInviteCreate, type TeamRole } from "@/lib/api";

import {
  acceptInvite,
  changeMemberRole,
  createTeam,
  inviteMembers,
  removeMember,
  renameTeam,
} from "../api";

function useInvalidateTeam() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: qk.team() });
}

/** Applies `edit` to the cached team; returns the previous value for rollback. */
async function patchTeam(client: QueryClient, edit: (team: Team) => Team) {
  await client.cancelQueries({ queryKey: qk.team() });
  const previous = client.getQueryData<Team | null>(qk.team());
  if (previous) client.setQueryData<Team | null>(qk.team(), edit(previous));
  return { previous };
}

export function useCreateTeam() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createTeam(name),
    // Shown inline in the create form, where the typed name stays put.
    meta: { errorToast: false },
    onSuccess: (team) => {
      client.setQueryData(qk.team(), team);
      toast.success(`Created ${team.name}`);
    },
  });
}

export function useRenameTeam() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => renameTeam(id, name),
    onSuccess: (team) => {
      client.setQueryData(qk.team(), team);
      toast.success("Team renamed");
    },
  });
}

export function useInviteMembers(teamId: number) {
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: (body: TeamInviteCreate) => inviteMembers(teamId, body),
    // The modal shows failures (e.g. everyone already invited) next to the chips.
    meta: { errorToast: false },
    onSuccess: () => invalidate(),
  });
}

/** Optimistic: the Select shows the new role at once and snaps back if the server refuses. */
export function useChangeRole() {
  const client = useQueryClient();
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: TeamRole }) => changeMemberRole(id, role),
    onMutate: ({ id, role }) =>
      patchTeam(client, (team) => ({
        ...team,
        members: team.members.map((m) => (m.id === id ? { ...m, role } : m)),
      })),
    onError: (_error, _vars, context) => {
      if (context?.previous) client.setQueryData(qk.team(), context.previous);
    },
    // A self-demotion changes `my_role`, which only the server can say.
    onSettled: () => invalidate(),
  });
}

export function useRemoveMember() {
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: (id: number) => removeMember(id),
    onSuccess: async () => {
      toast.success("Member removed");
      await invalidate();
    },
  });
}

export function useAcceptInvite() {
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: (token: string) => acceptInvite(token),
    meta: { errorToast: false },
    onSuccess: () => invalidate(),
  });
}
