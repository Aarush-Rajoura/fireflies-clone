type Spoken = { speaker_id: number };

/**
 * For each segment, whether it starts a new speaker turn. Consecutive lines by
 * the same speaker share one "Name ▾ · 00:53" header, like Fireflies.
 */
export function speakerTurnStarts(segments: readonly Spoken[]): boolean[] {
  return segments.map((s, i) => i === 0 || segments[i - 1]?.speaker_id !== s.speaker_id);
}
