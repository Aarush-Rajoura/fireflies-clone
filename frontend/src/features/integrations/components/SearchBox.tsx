"use client";

import { useState } from "react";

import { SearchInput } from "@/components/ui";

export type SearchBoxProps = {
  /** The committed query from the URL. */
  value: string;
  onSearch: (q: string) => void;
  className?: string;
};

/** Debounced catalogue search. Local text keeps typing smooth; the URL only gets settled values. */
export function SearchBox({ value, onSearch, className }: SearchBoxProps) {
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);

  // Back/forward or a link can change the query underneath the field: adopt it during render.
  if (synced !== value) {
    setSynced(value);
    setText(value);
  }

  return (
    <SearchInput
      label="Search integrations"
      placeholder="Search"
      value={text}
      onValueChange={setText}
      onSearch={(q) => {
        // Our own commit coming back through the URL must not overwrite newer keystrokes.
        setSynced(q.trim());
        onSearch(q);
      }}
      debounceMs={250}
      className={className}
    />
  );
}
