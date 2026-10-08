import type { JoinPreference, Me, OnboardingInput, RecapPreference } from "@/lib/api";

import { commitEmailDraft, MAX_INVITES } from "@/lib/utils/email";

import { DEFAULTS } from "./options";

export const STEPS = ["join", "recap", "role", "tools", "invite"] as const;
export type StepId = (typeof STEPS)[number];
export const LAST_STEP = STEPS.length - 1;

export type WizardState = {
  step: number;
  join: JoinPreference | null;
  recap: RecapPreference | null;
  role: string | null;
  jobTitle: string;
  tools: string[];
  invites: string[];
  /** Text typed into the invite box but not yet turned into chips. */
  inviteDraft: string;
  inviteError: string | null;
};

export type WizardAction =
  | { type: "next" }
  | { type: "back" }
  | { type: "skip" }
  | { type: "setJoin"; value: JoinPreference }
  | { type: "setRecap"; value: RecapPreference }
  | { type: "setRole"; value: string }
  | { type: "setJobTitle"; value: string }
  | { type: "toggleTool"; tool: string }
  | { type: "setInviteDraft"; value: string }
  | { type: "commitInviteDraft" }
  | { type: "removeInvite"; email: string };

/** Starts empty, or from earlier answers when the user restarts onboarding. */
export function initWizard(
  me?: Pick<Me, "join_preference" | "recap_preference" | "role" | "job_title" | "tools">,
): WizardState {
  return {
    step: 0,
    join: me?.join_preference ?? null,
    recap: me?.recap_preference ?? null,
    role: me?.role ?? null,
    jobTitle: me?.job_title ?? "",
    tools: me?.tools ?? [],
    invites: [],
    inviteDraft: "",
    inviteError: null,
  };
}

export const stepId = (state: WizardState): StepId => STEPS[state.step] ?? "invite";

/** Next is offered only once the current question has an answer; Skip is always available. */
export function canAdvance(state: WizardState): boolean {
  switch (stepId(state)) {
    case "join":
      return state.join !== null;
    case "recap":
      return state.recap !== null;
    case "role":
      return state.role !== null;
    case "tools":
      return true;
    case "invite":
      return state.inviteError === null;
  }
}

function commitDraft(state: WizardState): WizardState {
  const { emails, draft, error } = commitEmailDraft(
    state.invites,
    state.inviteDraft,
    MAX_INVITES,
    `You can invite up to ${MAX_INVITES} coworkers here.`,
  );
  return { ...state, invites: emails, inviteDraft: draft, inviteError: error };
}

const clampStep = (step: number) => Math.min(Math.max(step, 0), LAST_STEP);

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "next":
      return canAdvance(state) ? { ...state, step: clampStep(state.step + 1) } : state;
    case "skip":
      return { ...state, step: clampStep(state.step + 1) };
    case "back":
      return { ...state, step: clampStep(state.step - 1) };
    case "setJoin":
      return { ...state, join: action.value };
    case "setRecap":
      return { ...state, recap: action.value };
    case "setRole":
      return { ...state, role: action.value };
    case "setJobTitle":
      return { ...state, jobTitle: action.value };
    case "toggleTool":
      return {
        ...state,
        tools: state.tools.includes(action.tool)
          ? state.tools.filter((t) => t !== action.tool)
          : [...state.tools, action.tool],
      };
    case "setInviteDraft":
      return { ...state, inviteDraft: action.value, inviteError: null };
    case "commitInviteDraft":
      return commitDraft(state);
    case "removeInvite":
      return { ...state, invites: state.invites.filter((e) => e !== action.email) };
  }
}

/**
 * The request body. Skipped questions fall back to defaults; `withInvites: false`
 * is the "Skip" on the last step. Returns null while the invite box holds an
 * invalid entry, so a typo is never silently dropped.
 */
export function toPayload(
  state: WizardState,
  { withInvites = true }: { withInvites?: boolean } = {},
): OnboardingInput | null {
  let invites: string[] = [];
  if (withInvites) {
    const committed = commitDraft(state);
    if (committed.inviteError !== null) return null;
    invites = committed.invites;
  }
  return {
    join_preference: state.join ?? DEFAULTS.join,
    recap_preference: state.recap ?? DEFAULTS.recap,
    role: state.role ?? DEFAULTS.role,
    job_title: state.jobTitle.trim(),
    tools: state.tools,
    invite_emails: invites,
  };
}
