"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, type FormEvent } from "react";

import { BrandMark, Button, ProgressBar, Spinner, StateView } from "@/components/ui";
import { useMe } from "@/features/user";
import type { Me } from "@/lib/api";

import { useSaveOnboarding } from "../hooks/useSaveOnboarding";
import {
  canAdvance,
  initWizard,
  LAST_STEP,
  STEPS,
  stepId,
  toPayload,
  wizardReducer,
  type StepId,
} from "../lib/wizard";

import { InviteStep, JoinStep, RecapStep, RoleStep, ToolsStep } from "./steps";

const COPY: Record<StepId, { title: string; lead: string }> = {
  join: {
    title: "Which meetings should Fred join?",
    lead: "Fred, your AI notetaker, records and transcribes the meetings you choose.",
  },
  recap: {
    title: "Who should receive meeting recaps?",
    lead: "After each meeting Fred emails a summary with notes and action items.",
  },
  role: {
    title: "What do you do?",
    lead: "We tailor summary templates and Ask Fred suggestions to your role.",
  },
  tools: {
    title: "Which tools do you use?",
    lead: "Pick any that apply. We will suggest integrations for them later.",
  },
  invite: {
    title: "Invite your coworkers",
    lead: "Share meeting notes and search conversations together. You can skip this for now.",
  },
};

const STEP_PANELS = {
  join: JoinStep,
  recap: RecapStep,
  role: RoleStep,
  tools: ToolsStep,
  invite: InviteStep,
} satisfies Record<StepId, unknown>;

function WizardForm({ me }: { me: Me }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(wizardReducer, me, initWizard);
  const save = useSaveOnboarding(() => router.push("/home"));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const id = stepId(state);
  const isLast = state.step === LAST_STEP;
  const Panel = STEP_PANELS[id];

  // Moving between steps replaces the question, so focus follows it for keyboard and screen-reader users.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [state.step]);

  const finish = (withInvites: boolean) => {
    const payload = toPayload(state, { withInvites });
    if (payload === null) dispatch({ type: "commitInviteDraft" });
    else save.mutate(payload);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (save.isPending) return;
    if (isLast) finish(true);
    else dispatch({ type: "next" });
  };

  const onSkip = () => (isLast ? finish(false) : dispatch({ type: "skip" }));

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-8"
      aria-labelledby="onboarding-question"
    >
      <div className="flex flex-col gap-3">
        <p className="text-meta text-muted">
          Step {state.step + 1} of {STEPS.length}
        </p>
        <ProgressBar
          label="Onboarding progress"
          value={state.step + 1}
          max={STEPS.length}
          valueText={`Step ${state.step + 1} of ${STEPS.length}`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <h1
          id="onboarding-question"
          ref={headingRef}
          tabIndex={-1}
          className="text-display text-strong outline-none"
        >
          {COPY[id].title}
        </h1>
        <p className="text-body text-secondary">{COPY[id].lead}</p>
      </div>

      <Panel state={state} dispatch={dispatch} />

      <div className="flex items-center gap-2 border-t border-subtle pt-6">
        {state.step > 0 && (
          <Button
            variant="ghost"
            leadingIcon={<ArrowLeft strokeWidth={1.75} />}
            onClick={() => dispatch({ type: "back" })}
            disabled={save.isPending}
          >
            Back
          </Button>
        )}
        <span className="flex-1" />
        <Button variant="ghost" onClick={onSkip} disabled={save.isPending}>
          {isLast ? "Skip for now" : "Skip"}
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!canAdvance(state)}
          loading={save.isPending}
          trailingIcon={isLast ? undefined : <ArrowRight strokeWidth={1.75} />}
        >
          {isLast ? (state.invites.length > 0 ? "Send invites & finish" : "Finish") : "Next"}
        </Button>
      </div>
    </form>
  );
}

/** One question per step; answers are saved to the demo user at the end, then the app opens on Home. */
export function OnboardingWizard() {
  const me = useMe();
  return (
    <main className="flex min-h-screen flex-col bg-surface-0">
      <header className="flex h-topbar items-center px-6">
        <BrandMark withWordmark />
      </header>
      <div className="mx-auto flex w-full max-w-modal-md flex-1 flex-col px-6 pb-16 pt-6 sm:pt-12">
        <StateView
          query={me}
          isEmpty={() => false}
          empty={null}
          loading={
            <div className="flex justify-center py-24">
              <Spinner />
            </div>
          }
          errorMessage="We couldn't load your account. Check that the backend is running."
        >
          {(data) => <WizardForm me={data} />}
        </StateView>
      </div>
    </main>
  );
}
