"use client";

import { Check, Pencil, UserPlus, X } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button, IconButton, Input } from "@/components/ui";
import type { Team } from "@/lib/api";

import { useRenameTeam } from "../hooks/useTeamMutations";
import { canManageTeam } from "../lib/members";

export type TeamHeaderProps = { team: Team; onInvite: () => void };

/** Team name (editable by owners and admins), member count and the Invite button. */
export function TeamHeader({ team, onInvite }: TeamHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const rename = useRenameTeam();
  const manager = canManageTeam(team.my_role);
  const active = team.members.filter((m) => m.status === "active").length;
  const pending = team.members.length - active;

  const startEdit = () => {
    setName(team.name);
    setEditing(true);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === team.name) return setEditing(false);
    rename.mutate({ id: team.id, name: trimmed }, { onSuccess: () => setEditing(false) });
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        {editing ? (
          <form onSubmit={submit} className="flex items-center gap-1">
            <Input
              aria-label="Team name"
              autoFocus
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
              className="w-72"
            />
            <IconButton
              type="submit"
              label="Save name"
              icon={<Check strokeWidth={1.75} />}
              loading={rename.isPending}
            />
            <IconButton
              label="Cancel"
              icon={<X strokeWidth={1.75} />}
              onClick={() => setEditing(false)}
            />
          </form>
        ) : (
          <div className="flex items-center gap-1">
            <h1 className="truncate text-h2 text-strong">{team.name}</h1>
            {manager && (
              <IconButton
                label="Rename team"
                size="sm"
                icon={<Pencil strokeWidth={1.75} />}
                onClick={startEdit}
              />
            )}
          </div>
        )}
        <p className="mt-1 text-meta text-muted">
          {active} active {active === 1 ? "member" : "members"}
          {pending > 0 && ` · ${pending} pending ${pending === 1 ? "invite" : "invites"}`}
        </p>
      </div>
      {manager && (
        <Button variant="primary" leadingIcon={<UserPlus strokeWidth={1.75} />} onClick={onInvite}>
          Invite members
        </Button>
      )}
    </header>
  );
}
