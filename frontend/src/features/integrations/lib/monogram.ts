import { speakerIndex } from "@/lib/utils/identity";

/*
 * Integrations are drawn as letter tiles instead of vendor logos, which this
 * app has no licence to ship. The fill is keyed on the stable integration key,
 * so a tile keeps its colour across renames and pages.
 */
const FILLS = [
  "bg-avatar-0",
  "bg-avatar-1",
  "bg-avatar-2",
  "bg-avatar-3",
  "bg-avatar-4",
  "bg-avatar-5",
  "bg-avatar-6",
  "bg-avatar-7",
] as const;

export function monogramFill(key: string): string {
  return FILLS[speakerIndex(key, FILLS.length)] ?? FILLS[0];
}

/** One letter for a single word ("HubSpot" → "H"), two for several ("Google Meet" → "GM"). */
export function monogramLetters(name: string): string {
  const words = name.split(/[\s.]+/).filter((w) => /^[a-z0-9]/i.test(w));
  const first = words[0]?.[0] ?? "?";
  const second = words.length > 1 ? (words[1]?.[0] ?? "") : "";
  return (first + second).toUpperCase();
}
