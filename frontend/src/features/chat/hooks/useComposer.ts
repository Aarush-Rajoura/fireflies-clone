"use client";

import { useState, type KeyboardEvent, type RefObject } from "react";

import type { ChatMessageCreate, ChatSkill } from "@/lib/api";

import { activeTrigger, removeTrigger, type Trigger } from "../lib/trigger";
import { useChatSkills } from "./useChats";
import { useMeetingSearch } from "./useMeetingSearch";

export type MeetingContext = { id: number; title: string };

export type MenuOption =
  | { kind: "meeting"; meeting: MeetingContext; upcoming: boolean; when: string }
  | { kind: "skill"; skill: ChatSkill };

const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

/**
 * The composer's state: the draft, the @meeting and /skill chips, and the
 * popup menu that the caret's current `@…` or leading `/…` token opens.
 * `onSubmit` returns whether the message was accepted, so a refused send keeps the draft.
 */
export function useComposer(
  onSubmit: (body: ChatMessageCreate) => boolean,
  inputRef: RefObject<HTMLTextAreaElement | null>,
) {
  const [draft, setDraft] = useState("");
  const [caret, setCaret] = useState(0);
  const [meeting, setMeeting] = useState<MeetingContext | null>(null);
  const [skill, setSkill] = useState<ChatSkill | null>(null);
  const [active, setActive] = useState(0);
  // Escape closes the menu for the token at this position until the user types elsewhere.
  const [dismissed, setDismissed] = useState<number | null>(null);

  const found = activeTrigger(draft, caret);
  const trigger: Trigger | null = found && found.start !== dismissed ? found : null;
  const meetings = useMeetingSearch(trigger?.query ?? "", trigger?.kind === "mention");
  const skills = useChatSkills();

  const options = ((): MenuOption[] => {
    if (trigger?.kind === "mention") {
      return (meetings.data ?? []).map((m) => ({
        kind: "meeting",
        meeting: { id: m.id, title: m.title },
        upcoming: m.status === "scheduled",
        when: dateFormat.format(new Date(m.started_at)),
      }));
    }
    if (trigger?.kind === "skill") {
      const q = trigger.query.toLowerCase();
      return (skills.data ?? [])
        .filter((s) => s.id.includes(q) || s.label.toLowerCase().includes(q))
        .map((s) => ({ kind: "skill", skill: s }));
    }
    return [];
  })();

  const menuOpen = trigger !== null;
  const loading = trigger?.kind === "mention" ? meetings.isFetching : skills.isLoading;

  const update = (value: string, at: number) => {
    setDraft(value);
    setCaret(at);
    setActive(0);
    if (dismissed !== null && activeTrigger(value, at)?.start !== dismissed) setDismissed(null);
  };

  const placeCaret = (at: number) => {
    setCaret(at);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(at, at);
    });
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option || !trigger) return;
    if (option.kind === "meeting") setMeeting(option.meeting);
    else setSkill(option.skill);
    const next = removeTrigger(draft, trigger, caret);
    setDraft(next);
    placeCaret(Math.min(trigger.start, next.length));
  };

  /** Starts a token at the end of the draft, for the composer's + and skills buttons. */
  const insert = (char: "@" | "/") => {
    const next = char === "/" ? "/" : draft && !draft.endsWith(" ") ? `${draft} @` : `${draft}@`;
    setDismissed(null);
    setDraft(next);
    placeCaret(next.length);
  };

  const submit = () => {
    const question = draft.trim() || skill?.label || "";
    if (!question) return;
    const body: ChatMessageCreate = {
      question,
      ...(meeting ? { meeting_id: meeting.id } : {}),
      ...(skill ? { skill: skill.id } : {}),
    };
    if (!onSubmit(body)) return;
    setDraft("");
    setCaret(0);
    setSkill(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // An IME confirming a character also fires Enter (and arrows); leave those alone.
    if (e.nativeEvent.isComposing) return;
    if (menuOpen) {
      const last = options.length - 1;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        setActive((i) => (last < 0 ? 0 : (i + step + last + 1) % (last + 1)));
        return;
      }
      if ((e.key === "Enter" || e.key === "Tab") && options.length > 0) {
        e.preventDefault();
        choose(Math.min(active, last));
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setDismissed(trigger.start);
        return;
      }
    }
    if (e.key === "Backspace" && !draft && e.currentTarget.selectionStart === 0) {
      if (skill) setSkill(null);
      else if (meeting) setMeeting(null);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return {
    draft,
    update,
    setCaret,
    meeting,
    setMeeting,
    skill,
    setSkill,
    menu: { open: menuOpen, kind: trigger?.kind, options, active, setActive, choose, loading },
    insert,
    submit,
    onKeyDown,
    canSend: Boolean(draft.trim() || skill),
  };
}
