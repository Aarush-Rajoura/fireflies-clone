"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Kbd, SearchInput } from "@/components/ui";

/** Top-bar search. Enter opens the results page; Ctrl/Cmd+K focuses it from anywhere. */
export function GlobalSearch() {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <SearchInput
      ref={ref}
      label="Search meetings"
      placeholder="Search by title or keyword"
      value={value}
      onValueChange={setValue}
      hint={<Kbd keys={["Ctrl", "K"]} />}
      onKeyDown={(e) => {
        const q = value.trim();
        if (e.key === "Enter" && q) router.push(`/search?q=${encodeURIComponent(q)}`);
      }}
    />
  );
}
