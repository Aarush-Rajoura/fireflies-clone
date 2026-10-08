import type { SelectOption } from "@/components/ui";

export const NOBODY = "unassigned"; // Radix Select forbids an empty-string value.

type Person = { id: number; display_name: string };

/**
 * Unassigned + the meeting's participants. The current assignee is kept even if
 * missing from the list (e.g. removed from the meeting), so the Select never
 * shows a blank value for a real assignment.
 */
export function assigneeOptions(
  participants: readonly Person[],
  current: Person | null,
): SelectOption[] {
  const people = [...participants];
  if (current && !people.some((p) => p.id === current.id)) people.push(current);
  return [
    { value: NOBODY, label: "Unassigned" },
    ...people.map((p) => ({ value: String(p.id), label: p.display_name })),
  ];
}

/** A full `YYYY-MM-DD` with a 4-digit year ≥ 1000; rejects what a half-typed year produces ("0002-…"). */
export function isCompleteDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return !!m && Number(m[1]) >= 1000;
}
