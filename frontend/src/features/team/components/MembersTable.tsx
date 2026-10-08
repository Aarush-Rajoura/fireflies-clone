"use client";

import { Link2, Trash2 } from "lucide-react";
import { useState } from "react";

import { Avatar, Badge, ConfirmDialog, IconButton, Select, toast } from "@/components/ui";
import type { Team, TeamMember, TeamRole } from "@/lib/api";

import { useChangeRole, useRemoveMember } from "../hooks/useTeamMutations";
import {
  absoluteInviteUrl,
  canEditMember,
  formatDate,
  isLastOwner,
  memberName,
  ROLE_LABELS,
  roleOptions,
} from "../lib/members";

const headCell = "px-4 py-2 text-left text-label font-medium text-muted";

export function MembersTable({ team }: { team: Team }) {
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const remove = useRemoveMember();

  const confirmRemove = () => {
    if (!removing) return;
    remove.mutate(removing.id, { onSettled: () => setRemoving(null) });
  };

  return (
    <div className="overflow-x-auto rounded-card border border-subtle bg-surface-1">
      <table className="w-full min-w-[720px]">
        <thead className="border-b border-subtle">
          <tr>
            <th className={headCell}>Member</th>
            <th className={headCell}>Role</th>
            <th className={headCell}>Status</th>
            <th className={headCell}>Joined</th>
            <th className={headCell}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {team.members.map((m) => (
            <MemberRow key={m.id} member={m} team={team} onRemove={() => setRemoving(m)} />
          ))}
        </tbody>
      </table>
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && !remove.isPending && setRemoving(null)}
        title={removing?.status === "invited" ? "Revoke invite?" : "Remove member?"}
        description={
          removing
            ? `${memberName(removing)} will lose access to ${team.name}. You can invite them again later.`
            : undefined
        }
        confirmLabel={removing?.status === "invited" ? "Revoke" : "Remove"}
        danger
        loading={remove.isPending}
        onConfirm={confirmRemove}
      />
    </div>
  );
}

function MemberRow({
  member,
  team,
  onRemove,
}: {
  member: TeamMember;
  team: Team;
  onRemove: () => void;
}) {
  const changeRole = useChangeRole();
  const name = memberName(member);
  const editable = canEditMember(team.my_role, member);
  const lastOwner = isLastOwner(member, team.members);

  const copyLink = async () => {
    if (!member.invite_url) return;
    try {
      await navigator.clipboard.writeText(
        absoluteInviteUrl(member.invite_url, window.location.origin),
      );
      toast.success("Invite link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  return (
    <tr className="border-b border-subtle last:border-b-0" data-testid="team-member-row">
      <td className="px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={name} src={member.avatar_url ?? undefined} size="md" />
          <div className="min-w-0">
            <p className="truncate text-body-strong text-primary">{name}</p>
            {member.display_name && <p className="truncate text-meta text-muted">{member.email}</p>}
          </div>
        </div>
      </td>
      <td className="w-40 px-4 py-3">
        {editable && !lastOwner ? (
          <Select
            size="sm"
            label={`Role for ${name}`}
            options={roleOptions(team.my_role)}
            value={member.role}
            onValueChange={(role) => changeRole.mutate({ id: member.id, role: role as TeamRole })}
          />
        ) : (
          <span
            className="text-body text-secondary"
            title={lastOwner ? "A team needs at least one owner" : undefined}
          >
            {ROLE_LABELS[member.role]}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge tone={member.status === "active" ? "success" : "warning"}>{member.status}</Badge>
      </td>
      <td className="tnum px-4 py-3 text-body text-secondary">{formatDate(member.joined_at)}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          {member.invite_url && editable && (
            <IconButton
              label="Copy invite link"
              size="sm"
              icon={<Link2 strokeWidth={1.75} />}
              onClick={copyLink}
            />
          )}
          {editable && !lastOwner && (
            <IconButton
              label={member.status === "invited" ? `Revoke invite for ${name}` : `Remove ${name}`}
              size="sm"
              icon={<Trash2 strokeWidth={1.75} />}
              onClick={onRemove}
            />
          )}
        </div>
      </td>
    </tr>
  );
}
