import type { JoinPreference, RecapPreference } from "@/lib/api";

export const JOIN_OPTIONS: { value: JoinPreference; label: string; description: string }[] = [
  { value: "owned", label: "Meetings I own", description: "Fred joins meetings you organise." },
  {
    value: "all",
    label: "All meetings on my calendar",
    description: "Every meeting with a video link, organised by anyone.",
  },
  {
    value: "team",
    label: "Only meetings with my team",
    description: "Meetings where a teammate is also invited.",
  },
  {
    value: "invited",
    label: "Only when I invite Fred",
    description: "Fred stays out unless you add fred@fireflies.ai.",
  },
];

export const RECAP_OPTIONS: { value: RecapPreference; label: string; description: string }[] = [
  { value: "me", label: "Only me", description: "Recaps land in your inbox only." },
  {
    value: "everyone",
    label: "Everyone on the invite",
    description: "All participants get the summary and action items.",
  },
  {
    value: "team",
    label: "Only my Fireflies team",
    description: "Teammates on your workspace receive recaps.",
  },
];

export const ROLES = [
  "Engineering",
  "Product",
  "Sales",
  "Marketing",
  "Customer Success",
  "Operations",
  "Founder/Executive",
  "Other",
] as const;

/** `tone` indexes the avatar palette; `mark` is the drawn monogram (no third-party logos). */
export type ToolOption = { id: string; label: string; mark: string; tone: number };

export const TOOLS: ToolOption[] = [
  { id: "zoom", label: "Zoom", mark: "Z", tone: 5 },
  { id: "google-meet", label: "Google Meet", mark: "GM", tone: 1 },
  { id: "microsoft-teams", label: "Microsoft Teams", mark: "T", tone: 6 },
  { id: "slack", label: "Slack", mark: "S", tone: 3 },
  { id: "notion", label: "Notion", mark: "N", tone: 7 },
  { id: "hubspot", label: "HubSpot", mark: "H", tone: 2 },
  { id: "salesforce", label: "Salesforce", mark: "SF", tone: 0 },
  { id: "asana", label: "Asana", mark: "A", tone: 4 },
  { id: "jira", label: "Jira", mark: "J", tone: 1 },
  { id: "linear", label: "Linear", mark: "L", tone: 6 },
  { id: "gmail", label: "Gmail", mark: "G", tone: 2 },
  { id: "outlook", label: "Outlook", mark: "O", tone: 5 },
];

/** Answers a skipped required step falls back to, so a skip never blocks finishing. */
export const DEFAULTS = { join: "owned", recap: "everyone", role: "Other" } as const satisfies {
  join: JoinPreference;
  recap: RecapPreference;
  role: (typeof ROLES)[number];
};
