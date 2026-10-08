"use client";

import { Crown } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";

import { Chip, Input } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

import {
  addParticipant,
  hasParticipant,
  removeParticipant,
  type ParticipantDraft,
} from "../lib/participants";

export type ParticipantsEditorProps = {
  value: readonly ParticipantDraft[];
  onChange: (next: readonly ParticipantDraft[]) => void;
  /** Workspace members offered as you type. */
  suggestions: readonly string[];
  inputId: string;
  invalid?: boolean;
};

const MAX_SUGGESTIONS = 6;

/** Chips for current participants plus a type-to-add input with workspace suggestions. */
export function ParticipantsEditor({
  value,
  onChange,
  suggestions,
  inputId,
  invalid,
}: ParticipantsEditorProps) {
  const [draft, setDraft] = useState("");
  const [highlight, setHighlight] = useState(0);
  const listId = useId();

  const q = draft.trim().toLocaleLowerCase();
  const matches = q
    ? suggestions
        .filter((s) => s.toLocaleLowerCase().includes(q) && !hasParticipant(value, s))
        .slice(0, MAX_SUGGESTIONS)
    : [];
  const open = matches.length > 0;

  const add = (name: string) => {
    onChange(addParticipant(value, name));
    setDraft("");
    setHighlight(0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const picked = open ? matches[highlight] : undefined;
      add(picked ?? draft);
    } else if (e.key === "ArrowDown" && open) {
      e.preventDefault();
      setHighlight((h) => (h + 1) % matches.length);
    } else if (e.key === "ArrowUp" && open) {
      e.preventDefault();
      setHighlight((h) => (h - 1 + matches.length) % matches.length);
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      const last = value.length - 1;
      if (!value[last]?.isHost) onChange(removeParticipant(value, last));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul aria-label="Current participants" className="flex flex-wrap gap-1.5">
          {value.map((p, i) => (
            <li key={p.id ?? `new-${p.display_name}`}>
              {p.isHost ? (
                <Chip icon={<Crown strokeWidth={1.75} />} disabled title="Host">
                  {p.display_name}
                </Chip>
              ) : (
                <Chip onRemove={() => onChange(removeParticipant(value, i))}>{p.display_name}</Chip>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <Input
          id={inputId}
          value={draft}
          invalid={invalid}
          placeholder="Add a participant and press Enter"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? `${listId}-${highlight}` : undefined}
          onChange={(e) => {
            setDraft(e.target.value);
            setHighlight(0);
          }}
          onKeyDown={onKeyDown}
        />
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Suggestions"
            className="absolute inset-x-0 top-full z-popover mt-1 max-h-56 overflow-y-auto rounded-panel border border-control bg-surface-1 p-1 shadow-overlay"
          >
            {matches.map((name, i) => (
              <li
                key={name}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === highlight}
                // mousedown, not click: keeps focus in the input.
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(name);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  "flex h-8 cursor-pointer items-center rounded-item px-2 text-body text-menu",
                  i === highlight && "bg-surface-hover text-primary",
                )}
              >
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
