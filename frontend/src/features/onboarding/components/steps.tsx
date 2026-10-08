"use client";

import { AtSign, Bot, CalendarCheck, Mail, User, Users, UsersRound } from "lucide-react";
import type { Dispatch, KeyboardEvent } from "react";

import { Chip, Field, Input, RadioCardGroup, Select } from "@/components/ui";

import { JOIN_OPTIONS, RECAP_OPTIONS, ROLES, TOOLS } from "../lib/options";
import type { WizardAction, WizardState } from "../lib/wizard";

import { ToolMark } from "./ToolMark";

type StepProps = { state: WizardState; dispatch: Dispatch<WizardAction> };

const JOIN_ICONS = {
  owned: <User strokeWidth={1.75} />,
  all: <CalendarCheck strokeWidth={1.75} />,
  team: <UsersRound strokeWidth={1.75} />,
  invited: <Bot strokeWidth={1.75} />,
};
const RECAP_ICONS = {
  me: <Mail strokeWidth={1.75} />,
  everyone: <Users strokeWidth={1.75} />,
  team: <UsersRound strokeWidth={1.75} />,
};

export function JoinStep({ state, dispatch }: StepProps) {
  return (
    <RadioCardGroup
      label="Which meetings should Fred join?"
      options={JOIN_OPTIONS.map((o) => ({ ...o, icon: JOIN_ICONS[o.value] }))}
      value={state.join}
      onChange={(value) => dispatch({ type: "setJoin", value })}
    />
  );
}

export function RecapStep({ state, dispatch }: StepProps) {
  return (
    <RadioCardGroup
      label="Who should receive meeting recaps?"
      options={RECAP_OPTIONS.map((o) => ({ ...o, icon: RECAP_ICONS[o.value] }))}
      value={state.recap}
      onChange={(value) => dispatch({ type: "setRecap", value })}
    />
  );
}

export function RoleStep({ state, dispatch }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <Field label="Role" htmlFor="onboarding-role">
        <Select
          id="onboarding-role"
          placeholder="Select your role"
          options={ROLES.map((r) => ({ value: r, label: r }))}
          value={state.role ?? undefined}
          onValueChange={(value) => dispatch({ type: "setRole", value })}
        />
      </Field>
      <Field
        label="Job title"
        htmlFor="onboarding-job-title"
        hint="Optional. Shown on your profile."
      >
        <Input
          id="onboarding-job-title"
          placeholder="e.g. Account Executive"
          maxLength={150}
          value={state.jobTitle}
          onChange={(e) => dispatch({ type: "setJobTitle", value: e.target.value })}
        />
      </Field>
    </div>
  );
}

export function ToolsStep({ state, dispatch }: StepProps) {
  return (
    <div role="group" aria-label="Tools you use" className="flex flex-wrap gap-2">
      {TOOLS.map((t) => (
        <Chip
          key={t.id}
          selected={state.tools.includes(t.id)}
          icon={<ToolMark mark={t.mark} tone={t.tone} />}
          onClick={() => dispatch({ type: "toggleTool", tool: t.id })}
          className="h-10 pl-2"
        >
          {t.label}
        </Chip>
      ))}
    </div>
  );
}

export function InviteStep({ state, dispatch }: StepProps) {
  const commitKeys = new Set(["Enter", ",", ";", " ", "Tab"]);
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const draft = state.inviteDraft.trim();
    // An empty box lets Enter submit the step and Tab move on; otherwise these keys make chips.
    if (!draft || !commitKeys.has(e.key)) {
      if (e.key === "Backspace" && !state.inviteDraft && state.invites.length > 0) {
        const last = state.invites[state.invites.length - 1];
        if (last) dispatch({ type: "removeInvite", email: last });
      }
      return;
    }
    if (e.key !== "Tab") e.preventDefault();
    dispatch({ type: "commitInviteDraft" });
  };

  return (
    <div className="flex flex-col gap-3">
      <Field
        label="Coworkers' emails"
        htmlFor="onboarding-invites"
        error={state.inviteError ?? undefined}
        hint="Press Enter or comma after each address. You can paste a list."
      >
        <Input
          id="onboarding-invites"
          type="text"
          inputMode="email"
          autoComplete="off"
          placeholder="name@company.com"
          leadingIcon={<AtSign strokeWidth={1.75} />}
          invalid={state.inviteError !== null}
          value={state.inviteDraft}
          onChange={(e) => dispatch({ type: "setInviteDraft", value: e.target.value })}
          onKeyDown={onKeyDown}
          onBlur={() => dispatch({ type: "commitInviteDraft" })}
        />
      </Field>
      {state.invites.length > 0 && (
        <ul aria-label="Coworkers to invite" className="flex flex-wrap gap-2">
          {state.invites.map((email) => (
            <li key={email}>
              <Chip onRemove={() => dispatch({ type: "removeInvite", email })}>{email}</Chip>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
