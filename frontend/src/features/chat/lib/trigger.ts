/**
 * What the composer's caret is in the middle of typing: an `@meeting` mention
 * (anywhere, after a space) or a `/skill` command (only at the very start).
 * `start` is where the trigger character sits, so the token can be replaced.
 */
export type Trigger = { kind: "mention" | "skill"; query: string; start: number };

export function activeTrigger(draft: string, caret: number): Trigger | null {
  const before = draft.slice(0, caret);
  const skill = /^\/([\w-]*)$/.exec(before);
  if (skill) return { kind: "skill", query: skill[1] ?? "", start: 0 };
  const mention = /(^|\s)@([^\s@]*)$/.exec(before);
  if (mention) {
    const query = mention[2] ?? "";
    return { kind: "mention", query, start: caret - query.length - 1 };
  }
  return null;
}

/** The draft with the trigger token (from `start` to the caret) cut out. */
export function removeTrigger(draft: string, trigger: Trigger, caret: number): string {
  const head = draft.slice(0, trigger.start).replace(/\s+$/, "");
  const tail = draft.slice(caret).replace(/^\s+/, "");
  return head && tail ? `${head} ${tail}` : head || tail;
}
