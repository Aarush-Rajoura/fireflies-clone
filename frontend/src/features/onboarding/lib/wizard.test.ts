import { describe, expect, it } from "vitest";

import { isValidEmail, splitEmails } from "./emails";
import {
  canAdvance,
  initWizard,
  LAST_STEP,
  stepId,
  toPayload,
  wizardReducer,
  type WizardAction,
  type WizardState,
} from "./wizard";

const run = (state: WizardState, ...actions: WizardAction[]) =>
  actions.reduce(wizardReducer, state);

describe("wizard reducer", () => {
  it("blocks Next until the current question is answered", () => {
    const s = initWizard();
    expect(canAdvance(s)).toBe(false);
    expect(wizardReducer(s, { type: "next" }).step).toBe(0);
    const answered = run(s, { type: "setJoin", value: "team" }, { type: "next" });
    expect(stepId(answered)).toBe("recap");
  });

  it("walks forward and back, clamped to the first and last step", () => {
    let s = run(
      initWizard(),
      { type: "back" },
      { type: "setJoin", value: "owned" },
      { type: "next" },
      { type: "setRecap", value: "me" },
      { type: "next" },
      { type: "setRole", value: "Sales" },
      { type: "next" },
      { type: "next" },
    );
    expect(stepId(s)).toBe("invite");
    s = run(s, { type: "skip" }, { type: "next" });
    expect(s.step).toBe(LAST_STEP);
    s = run(s, { type: "back" }, { type: "back" });
    expect(stepId(s)).toBe("role");
  });

  it("Skip advances without an answer and the payload falls back to defaults", () => {
    const s = run(initWizard(), { type: "skip" }, { type: "skip" }, { type: "skip" });
    expect(stepId(s)).toBe("tools");
    expect(toPayload(s)).toEqual({
      join_preference: "owned",
      recap_preference: "everyone",
      role: "Other",
      job_title: "",
      tools: [],
      invite_emails: [],
    });
  });

  it("toggles tools on and off, keeping pick order", () => {
    const s = run(
      initWizard(),
      { type: "toggleTool", tool: "zoom" },
      { type: "toggleTool", tool: "slack" },
      { type: "toggleTool", tool: "zoom" },
      { type: "toggleTool", tool: "jira" },
    );
    expect(s.tools).toEqual(["slack", "jira"]);
  });

  it("turns the draft into deduped chips and keeps invalid entries for fixing", () => {
    let s = run(
      initWizard(),
      { type: "setInviteDraft", value: "Ana@Acme.io, bob@acme.io; nope ana@acme.io" },
      { type: "commitInviteDraft" },
    );
    expect(s.invites).toEqual(["ana@acme.io", "bob@acme.io"]);
    expect(s.inviteDraft).toBe("nope");
    expect(s.inviteError).toMatch(/"nope" is not a valid email/);
    expect(canAdvance({ ...s, step: LAST_STEP })).toBe(false);
    s = run(
      s,
      { type: "setInviteDraft", value: "" },
      { type: "removeInvite", email: "bob@acme.io" },
    );
    expect(s.inviteError).toBeNull();
    expect(s.invites).toEqual(["ana@acme.io"]);
  });

  it("includes a valid uncommitted draft in the payload, and refuses an invalid one", () => {
    const s = run(initWizard(), { type: "setInviteDraft", value: "cy@acme.io" });
    expect(toPayload(s)?.invite_emails).toEqual(["cy@acme.io"]);
    const bad = run(initWizard(), { type: "setInviteDraft", value: "cy@" });
    expect(toPayload(bad)).toBeNull();
    // Skipping the invite step ignores whatever is typed.
    expect(toPayload(bad, { withInvites: false })?.invite_emails).toEqual([]);
  });

  it("pre-fills earlier answers when onboarding is restarted", () => {
    const s = initWizard({
      join_preference: "invited",
      recap_preference: "team",
      role: "Product",
      job_title: "PM",
      tools: ["notion"],
    });
    expect(canAdvance(s)).toBe(true);
    expect(toPayload(s)).toMatchObject({
      join_preference: "invited",
      recap_preference: "team",
      role: "Product",
      job_title: "PM",
      tools: ["notion"],
    });
  });
});

describe("emails", () => {
  it("accepts plausible addresses only", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    for (const bad of ["a@b", "@b.co", "a b@c.co", "a@@b.co", ""])
      expect(isValidEmail(bad)).toBe(false);
  });

  it("splits on commas, semicolons and whitespace", () => {
    expect(splitEmails(" A@b.co,c@d.io;\n e@f.io  ")).toEqual(["a@b.co", "c@d.io", "e@f.io"]);
  });
});
