"use client";

import { AtSign, Info } from "lucide-react";
import { useState, type FormEvent, type KeyboardEvent } from "react";

import { Button, Chip, Field, Input, Modal, Select } from "@/components/ui";
import { ApiError, type TeamInviteResult } from "@/lib/api";
import { commitEmailDraft } from "@/lib/utils/email";

import { useInviteMembers } from "../hooks/useTeamMutations";

import { InviteLinks } from "./InviteLinks";

export type InviteModalProps = {
  teamId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type InviteRole = "member" | "admin";

const ROLE_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
];

const SKIP_REASON = { already_member: "already a member", already_invited: "already invited" };

/** Email chips + role → invite links. Simulated: nothing is emailed. */
export function InviteModal({ teamId, open, onOpenChange }: InviteModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Invite members"
      description="Add coworkers by email. You'll get an invite link to share with each of them."
    >
      {/* Mounted only while open, so each opening starts from an empty form. */}
      {open && <InviteForm teamId={teamId} onClose={() => onOpenChange(false)} />}
    </Modal>
  );
}

function InviteForm({ teamId, onClose }: { teamId: number; onClose: () => void }) {
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [role, setRole] = useState<InviteRole>("member");
  const [result, setResult] = useState<TeamInviteResult | null>(null);
  const invite = useInviteMembers(teamId);

  if (result) return <InviteResult result={result} onDone={onClose} />;

  /** Moves the typed text into chips; returns the full list so submit can use it at once. */
  const commit = (): string[] => {
    const next = commitEmailDraft(emails, draft);
    setEmails(next.emails);
    setDraft(next.draft);
    setDraftError(next.error);
    return next.error ? [] : next.emails;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !draft && emails.length > 0) {
      setEmails(emails.slice(0, -1));
      return;
    }
    if (!draft.trim() || !["Enter", ",", ";", " "].includes(e.key)) return;
    e.preventDefault();
    commit();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const list = commit();
    if (list.length === 0 || invite.isPending) return;
    invite.mutate({ emails: list, role }, { onSuccess: setResult });
  };

  const serverError =
    invite.error instanceof ApiError && invite.error.code === "MEMBER_EXISTS"
      ? "Everyone listed is already on the team."
      : invite.error?.message;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field
        label="Emails"
        htmlFor="invite-emails"
        error={draftError ?? serverError ?? undefined}
        hint="Press Enter or comma after each address. You can paste a list."
      >
        <Input
          id="invite-emails"
          autoFocus
          autoComplete="off"
          inputMode="email"
          placeholder="name@company.com"
          leadingIcon={<AtSign strokeWidth={1.75} />}
          invalid={Boolean(draftError ?? serverError)}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setDraftError(null);
            if (invite.isError) invite.reset();
          }}
          onKeyDown={onKeyDown}
          onBlur={() => draft.trim() && commit()}
        />
      </Field>
      {emails.length > 0 && (
        <ul aria-label="People to invite" className="flex flex-wrap gap-2">
          {emails.map((email) => (
            <li key={email}>
              <Chip onRemove={() => setEmails(emails.filter((x) => x !== email))}>{email}</Chip>
            </li>
          ))}
        </ul>
      )}
      <Field label="Role" htmlFor="invite-role">
        <Select
          id="invite-role"
          options={ROLE_OPTIONS}
          value={role}
          onValueChange={(v) => setRole(v as InviteRole)}
        />
      </Field>
      <div className="flex justify-end gap-2 pb-2">
        <Button variant="ghost" onClick={onClose} disabled={invite.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={emails.length === 0 && !draft.trim()}
          loading={invite.isPending}
        >
          Send invites
        </Button>
      </div>
    </form>
  );
}

function InviteResult({ result, onDone }: { result: TeamInviteResult; onDone: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-start gap-2 rounded-panel border border-accent-border bg-accent-faint p-3 text-meta text-secondary">
        <Info className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.75} aria-hidden />
        Demo — no email was sent. Copy each link and share it with your coworker.
      </p>
      <InviteLinks invites={result.invited} />
      {result.skipped.length > 0 && (
        <p className="text-meta text-muted">
          Skipped: {result.skipped.map((s) => `${s.email} (${SKIP_REASON[s.reason]})`).join(", ")}
        </p>
      )}
      <div className="flex justify-end pb-2">
        <Button variant="primary" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}
