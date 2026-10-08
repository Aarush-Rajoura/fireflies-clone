import { speakerIndex } from "@/lib/utils/identity";

export const TAG_COLOR_COUNT = 8;

/**
 * Colour comes from the name, not the id, so a tag looks the same in every
 * list and before the server has even assigned it an id. Case and outer
 * whitespace are ignored, matching how the backend dedupes names.
 */
export function tagColorIndex(name: string): number {
  return speakerIndex(name.trim().toLowerCase(), TAG_COLOR_COUNT);
}

// Literal class names so Tailwind can see them.
const TONES = [
  "bg-tag-subtle-0 text-tag-0",
  "bg-tag-subtle-1 text-tag-1",
  "bg-tag-subtle-2 text-tag-2",
  "bg-tag-subtle-3 text-tag-3",
  "bg-tag-subtle-4 text-tag-4",
  "bg-tag-subtle-5 text-tag-5",
  "bg-tag-subtle-6 text-tag-6",
  "bg-tag-subtle-7 text-tag-7",
] as const;

export function tagToneClass(name: string): string {
  return TONES[tagColorIndex(name)] ?? TONES[0];
}

const DOTS = [
  "bg-tag-0",
  "bg-tag-1",
  "bg-tag-2",
  "bg-tag-3",
  "bg-tag-4",
  "bg-tag-5",
  "bg-tag-6",
  "bg-tag-7",
] as const;

/** A solid swatch of the tag's hue, for dots beside a plain-text name. */
export function tagDotClass(name: string): string {
  return DOTS[tagColorIndex(name)] ?? DOTS[0];
}

/** Case-insensitive, like the backend's uniqueness rule. */
export function sameTagName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
