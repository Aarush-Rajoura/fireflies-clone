import type { MeetingCreate, TranscriptPreview } from "@/lib/api";

export type CreateTab = "upload" | "paste" | "form" | "media";
export type MeetingSource = MeetingCreate["source"];

/** What the details form collects; `startedAt` is a datetime-local value in the user's zone. */
export type MeetingDetails = {
  title: string;
  startedAt: string;
  participants: string[];
  channelId: number | null;
};

/** Speakers found in the transcript, de-duplicated case-insensitively, order kept. */
export function participantsFromPreview(preview: TranscriptPreview | null): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of preview?.speakers ?? []) {
    const name = raw.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** `YYYY-MM-DDTHH:mm` in local time, the format <input type="datetime-local"> expects. */
export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toUtcIso(local: string): string | null {
  if (!local) return null;
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * The POST /meetings body. With no preview (Form tab) `segments` is null, which
 * tells the backend to create a transcript-less meeting and skip the AI.
 */
export function buildMeetingCreate(
  details: MeetingDetails,
  source: MeetingSource,
  preview: TranscriptPreview | null,
): MeetingCreate {
  return {
    title: details.title.trim(),
    started_at: toUtcIso(details.startedAt),
    participants: details.participants.map((p) => p.trim()).filter(Boolean),
    segments: preview ? preview.segments : null,
    source,
    channel_id: details.channelId,
  };
}

export function sourceForTab(tab: CreateTab): MeetingSource {
  return tab === "upload" ? "upload" : tab === "paste" ? "paste" : "manual";
}
