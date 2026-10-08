"use client";

import { Users } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button, EmptyState, Field, Input } from "@/components/ui";

import { useCreateTeam } from "../hooks/useTeamMutations";

/** The no-team empty state: name a team and become its owner. */
export function CreateTeamForm() {
  const [name, setName] = useState("");
  const create = useCreateTeam();
  const trimmed = name.trim();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (trimmed && !create.isPending) create.mutate(trimmed);
  };

  return (
    <EmptyState
      icon={<Users strokeWidth={1.75} />}
      title="Create your team"
      description="Invite coworkers so meetings, notes and recaps can be shared with them."
      action={
        <form onSubmit={submit} className="flex w-80 flex-col gap-3 text-left">
          <Field
            label="Team name"
            htmlFor="team-name"
            error={create.error ? create.error.message || "Couldn't create the team." : undefined}
          >
            <Input
              id="team-name"
              value={name}
              maxLength={100}
              placeholder="e.g. Acme Sales"
              invalid={create.isError}
              onChange={(e) => {
                setName(e.target.value);
                if (create.isError) create.reset();
              }}
            />
          </Field>
          <Button type="submit" variant="primary" disabled={!trimmed} loading={create.isPending}>
            Create team
          </Button>
        </form>
      }
    />
  );
}
