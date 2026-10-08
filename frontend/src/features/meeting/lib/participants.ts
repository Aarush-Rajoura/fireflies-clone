import type { MeetingDetail, MeetingUpdate } from "@/lib/api";

/** A row in the participants editor: existing rows keep their id, new ones have none. */
export type ParticipantDraft = { id?: number; display_name: string; isHost?: boolean };

export const MAX_NAME_LENGTH = 200;
export const MAX_TITLE_LENGTH = 300;

const key = (name: string) => name.trim().toLocaleLowerCase();

/** Collapses inner whitespace so "Ann  Lee" and "Ann Lee" are the same person. */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function hasParticipant(list: readonly ParticipantDraft[], name: string): boolean {
  const k = key(normalizeName(name));
  return list.some((p) => key(p.display_name) === k);
}

/** Adds a name unless it is blank or already present (case-insensitive). Returns the same list when nothing changes. */
export function addParticipant(
  list: readonly ParticipantDraft[],
  raw: string,
): readonly ParticipantDraft[] {
  const name = normalizeName(raw);
  if (!name || hasParticipant(list, name)) return list;
  return [...list, { display_name: name }];
}

export function removeParticipant(
  list: readonly ParticipantDraft[],
  index: number,
): readonly ParticipantDraft[] {
  return list.filter((_, i) => i !== index);
}

export function draftsFrom(meeting: MeetingDetail): ParticipantDraft[] {
  return meeting.participants.map((p) => ({
    id: p.id,
    display_name: p.display_name,
    isHost: p.role === "host",
  }));
}

export type EditForm = {
  title: string;
  participants: readonly ParticipantDraft[];
  channelId: number | null;
};

export type EditErrors = { title?: string; participants?: string };

export function validateEdit(form: EditForm): EditErrors {
  const errors: EditErrors = {};
  const title = form.title.trim();
  if (!title) errors.title = "Give the meeting a title.";
  else if (title.length > MAX_TITLE_LENGTH)
    errors.title = `Keep the title under ${MAX_TITLE_LENGTH} characters.`;
  const long = form.participants.find((p) => p.display_name.length > MAX_NAME_LENGTH);
  if (long) errors.participants = `Names must be under ${MAX_NAME_LENGTH} characters.`;
  return errors;
}

function sameParticipants(meeting: MeetingDetail, drafts: readonly ParticipantDraft[]): boolean {
  if (meeting.participants.length !== drafts.length) return false;
  return meeting.participants.every(
    (p, i) => drafts[i]?.id === p.id && drafts[i]?.display_name === p.display_name,
  );
}

/**
 * Only the fields that changed go in the PATCH, so an untouched participant
 * list is never re-synced. Existing participants are sent with their id (the
 * backend keeps those rows and their speaker links); new ones by name only.
 */
export function buildMeetingPatch(meeting: MeetingDetail, form: EditForm): MeetingUpdate {
  const patch: MeetingUpdate = {};
  const title = form.title.trim();
  if (title !== meeting.title) patch.title = title;
  if (!sameParticipants(meeting, form.participants)) {
    patch.participants = form.participants.map((p) =>
      p.id === undefined
        ? { display_name: p.display_name }
        : { id: p.id, display_name: p.display_name },
    );
  }
  if (form.channelId !== (meeting.channel?.id ?? null)) patch.channel_id = form.channelId;
  return patch;
}
