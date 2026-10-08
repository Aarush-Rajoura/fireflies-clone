"use client";

import { useState, type KeyboardEvent } from "react";

import { Chip, Input } from "@/components/ui";

export type ParticipantsInputProps = {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
};

/** Names as removable chips; Enter or comma adds, Backspace on an empty field removes the last. */
export function ParticipantsInput({ id, value, onChange }: ParticipantsInputProps) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const name = draft.trim().replace(/,$/, "").trim();
    setDraft("");
    if (!name || value.some((v) => v.toLowerCase() === name.toLowerCase())) return;
    onChange([...value, name]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      // Enter would otherwise submit the whole meeting form.
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul aria-label="Participants" className="flex flex-wrap gap-1.5">
          {value.map((name) => (
            <li key={name}>
              <Chip onRemove={() => onChange(value.filter((v) => v !== name))}>{name}</Chip>
            </li>
          ))}
        </ul>
      )}
      <Input
        id={id}
        value={draft}
        placeholder="Add a name and press Enter"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
      />
    </div>
  );
}
