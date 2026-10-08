import type { Tag } from "@/lib/api";
import { speakerIndex } from "@/lib/utils/identity";

export const TAG_COLOR_COUNT = 8;

export type TagLike = Pick<Tag, "name"> & { color_index?: number | null };

/**
 * The swatch a new tag is created with: a hash of its name, ignoring case and
 * outer whitespace like the backend's dedupe rule, so a tag gets the same
 * colour whoever creates it.
 */
export function tagColorIndex(name: string): number {
  return speakerIndex(name.trim().toLowerCase(), TAG_COLOR_COUNT);
}

/**
 * The swatch a tag is shown in: its stored `color_index`, so renaming never
 * recolours it; the name hash only for a tag without a valid one.
 */
export function tagHue(tag: TagLike): number {
  const stored = tag.color_index;
  return typeof stored === "number" &&
    Number.isInteger(stored) &&
    stored >= 0 &&
    stored < TAG_COLOR_COUNT
    ? stored
    : tagColorIndex(tag.name);
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

export function tagToneClass(tag: TagLike): string {
  return TONES[tagHue(tag)] ?? TONES[0];
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
export function tagDotClass(tag: TagLike): string {
  return DOTS[tagHue(tag)] ?? DOTS[0];
}

/** Case-insensitive, like the backend's uniqueness rule. */
export function sameTagName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
