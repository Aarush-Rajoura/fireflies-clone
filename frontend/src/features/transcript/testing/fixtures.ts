import { vi } from "vitest";

import type { Segment, Speaker, Transcript } from "@/lib/api";

export const speakers: Speaker[] = [
  { id: 1, label: "Speaker 1", name: "Sarah Watts", color_index: 0, participant_id: null },
  { id: 2, label: "Speaker 2", name: "Janice", color_index: 2, participant_id: null },
];

const line = (id: number, speaker_id: number, start_ms: number, text: string): Segment => ({
  id,
  sequence: id,
  speaker_id,
  start_ms,
  end_ms: start_ms + 2_900,
  text,
  original_text: text,
  is_edited: false,
});

/** Five lines, 3s apart; Sarah speaks twice in a row, so line 2 has no header. */
export const segments: Segment[] = [
  line(101, 1, 0, "Welcome everyone to the kickoff."),
  line(102, 1, 3_000, "Let's start with pricing for Acme."),
  line(103, 2, 6_000, "Our team will work closely with your tech lead."),
  line(104, 1, 9_000, "Great, and the Café meeting is next week."),
  line(105, 2, 12_000, "Pricing looks fine to us."),
];

export const transcript: Transcript = { speakers, segments };

/** Fakes the clocks the player reads (performance.now, rAF) along with timeouts. */
export function installFakePlayerTimers(): void {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "performance",
      "Date",
    ],
  });
}
