import { ArrowUp, Check, Plus } from "lucide-react";

import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

/*
 * Static illustrations for the featured carousel. They are pictures of a
 * product moment, not controls, so they are hidden from assistive tech and
 * built from spans rather than interactive primitives.
 */

const panel = "rounded-card border border-control bg-surface-2 shadow-overlay";

/** An assistant prompt box with the meetings connector switched on. */
export function ChatMock() {
  return (
    <div aria-hidden className="relative w-full max-w-[470px] select-none pb-6">
      <div className={cn(panel, "flex min-h-[144px] flex-col justify-between p-5")}>
        <p className="text-body text-primary">What did I discuss in my last meeting with Sam?</p>
        <div className="flex items-end justify-between">
          <Plus className="size-5 text-secondary" strokeWidth={1.75} />
          <span className="flex size-11 items-center justify-center rounded-panel bg-accent text-on-accent">
            <ArrowUp className="size-5" strokeWidth={1.75} />
          </span>
        </div>
      </div>
      <div
        className={cn(
          panel,
          "absolute bottom-0 left-14 flex items-center gap-3 rounded-panel bg-surface-1 px-4 py-3",
        )}
      >
        <span className="flex size-5 items-center justify-center rounded-tag bg-brand-mark text-micro text-on-accent">
          M
        </span>
        <span className="text-body-strong text-strong">Meetings</span>
        <span className="ml-6 flex h-5 w-9 items-center justify-end rounded-full bg-accent px-0.5">
          <span className="block size-4 rounded-full bg-on-accent" />
        </span>
      </div>
    </div>
  );
}

const ROWS = [
  ["Q3 pipeline review", "Oct 6", "Sam Rivera", "4"],
  ["Design crit", "Oct 7", "Priya Shah", "2"],
  ["Hiring sync", "Oct 8", "Alex Kim", "3"],
] as const;

/** A spreadsheet of exported meetings: header row, three rows, one cell selected. */
export function SpreadsheetMock() {
  const cols = "grid grid-cols-[28px_1.6fr_0.8fr_1.1fr_0.7fr]";
  return (
    <div aria-hidden className={cn(panel, "w-full max-w-[470px] select-none overflow-hidden")}>
      <div className={cn(cols, "border-b border-subtle bg-surface-3 text-caption text-muted")}>
        {["", "A", "B", "C", "D"].map((c, i) => (
          <span key={i} className="border-r border-subtle px-2 py-1 text-center last:border-r-0">
            {c}
          </span>
        ))}
      </div>
      <div className={cn(cols, "border-b border-subtle text-label text-strong")}>
        {["1", "Meeting", "Date", "Owner", "Tasks"].map((c, i) => (
          <span
            key={i}
            className={cn(
              "border-r border-subtle px-2 py-2 last:border-r-0",
              i === 0 && "text-center text-caption text-muted",
            )}
          >
            {c}
          </span>
        ))}
      </div>
      {ROWS.map((row, r) => (
        <div
          key={r}
          className={cn(cols, "border-b border-subtle text-meta text-secondary last:border-b-0")}
        >
          <span className="border-r border-subtle px-2 py-2 text-center text-caption text-muted">
            {r + 2}
          </span>
          {row.map((cell, c) => (
            <span
              key={c}
              className={cn(
                "truncate border-r border-subtle px-2 py-2 last:border-r-0",
                r === 0 && c === 0 && "outline outline-2 -outline-offset-2 outline-success",
                c === 3 && "tnum text-right",
              )}
            >
              {cell}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** A CRM contact record with the meeting notes already logged against it. */
export function CrmMock() {
  return (
    <div
      aria-hidden
      className={cn(panel, "flex w-full max-w-[470px] select-none flex-col gap-4 p-5")}
    >
      <div className="flex items-center gap-3">
        <Avatar name="Sam Rivera" size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-body-strong text-strong">Sam Rivera</p>
          <p className="text-meta text-muted">VP Operations · Acme Corp</p>
        </div>
        <span className="rounded-tag bg-accent-faint px-2 py-0.5 text-caption text-accent">
          Negotiation
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {["Meeting summary logged", "3 next steps added as tasks", "Deal stage updated"].map(
          (line) => (
            <li key={line} className="flex items-center gap-2 text-meta text-secondary">
              <span className="flex size-4 items-center justify-center rounded-full bg-success-subtle text-success-strong">
                <Check className="size-3" strokeWidth={1.75} />
              </span>
              {line}
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
