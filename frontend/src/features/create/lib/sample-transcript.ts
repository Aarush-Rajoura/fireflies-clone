/*
 * The Paste tab's "Load sample". Bracketed timestamps and "Speaker:" prefixes,
 * so the demo exercises the parser path that keeps real timings instead of
 * estimating them, and it contains clear commitments for action-item extraction.
 */
export const SAMPLE_TRANSCRIPT = `[00:00] Priya Raman: Morning all. Three things today: the onboarding redesign, the billing incident, and the Q4 launch date.
[00:11] Daniel Okafor: Quick one first: did the incident write-up go out yesterday?
[00:16] Priya Raman: Not yet. Daniel, can you send the incident postmortem to the whole team by Thursday?
[00:23] Daniel Okafor: Yes, I'll send it by Thursday. Root cause was the retry job double-charging about forty accounts.
[00:34] Mei Tanaka: Support has refunded thirty-one of them. I'll finish the remaining nine refunds today.
[00:43] Priya Raman: Thanks Mei. On onboarding, the new checklist lifted activation from 38 to 46 percent in the beta cohort.
[00:55] Lucas Silva: That's with the shorter signup form too, so we can't fully separate the two effects.
[01:04] Priya Raman: Fair. Lucas, please set up a proper A/B test on the checklist alone before we roll it out.
[01:12] Lucas Silva: Will do. I'll have the experiment live by next Monday.
[01:19] Mei Tanaka: For the launch, marketing needs a firm date two weeks ahead for the email campaign.
[01:27] Priya Raman: Then let's commit to November 12th. We agreed to ship the redesign then unless the test shows a regression.
[01:36] Daniel Okafor: Works for engineering. I'll flag any blockers in the Friday standup.
[01:42] Priya Raman: Great. Decisions: launch November 12th, A/B test first, postmortem by Thursday. Thanks everyone.
`;
