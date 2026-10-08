import { isNarrowed, type MeetingsParams } from "./params";

export type EmptyKind = "filtered" | "channel" | "hosted" | "shared" | "uploads" | "first-run";

export type EmptyCopy = { kind: EmptyKind; title: string; description: string };

/**
 * What an empty list should say for the view it is. A search or filter wins,
 * because clearing it is the fix; "haven't recorded a meeting yet" is only
 * true for the unfiltered All Meetings view.
 */
export function emptyCopy(params: MeetingsParams, channelName?: string): EmptyCopy {
  if (isNarrowed(params)) {
    return {
      kind: "filtered",
      title: params.q ? `No meetings match “${params.q}”` : "No meetings match these filters",
      description: "Try a different search, or clear the filters to see more meetings.",
    };
  }
  if (params.channel !== undefined) {
    return {
      kind: "channel",
      title: channelName ? `No meetings in #${channelName} yet` : "No meetings in this channel yet",
      description: "Use “Move to channel” on any meeting to file it here.",
    };
  }
  switch (params.scope) {
    case "hosted":
      return {
        kind: "hosted",
        title: "You haven't hosted a meeting yet",
        description: "Meetings you host will show up right here.",
      };
    case "shared":
      return {
        kind: "shared",
        title: "Nothing shared with you yet",
        description: "Meetings teammates share with you will show up right here.",
      };
    case "uploads":
      return {
        kind: "uploads",
        title: "No uploads yet",
        description: "Upload a recording or a transcript and it'll show up right here.",
      };
    default:
      return {
        kind: "first-run",
        title: "Looks like you haven't recorded a meeting yet",
        description: "Once you record your first meeting with Fireflies, it'll show up right here.",
      };
  }
}
