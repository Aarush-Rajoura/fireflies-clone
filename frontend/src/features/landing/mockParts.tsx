// Reusable pieces of the HTML/CSS product mock-ups (no screenshots).
import type { ReactNode } from "react";
import { TRANSCRIPT, type TranscriptLine } from "./content";
import { Icon } from "./icons";
import { Avatar } from "./marks";

/** Window top bar: "# Sales / Kickoff Call" breadcrumb, REC badge and share controls. */
export function MockTopBar({ extra }: { extra?: string }) {
  return (
    <div className="flex h-11 items-center gap-3 border-b border-[var(--mk-line)] px-3 text-[12px] text-[var(--mk-body)] sm:px-4">
      <Icon name="menu" size={16} className="shrink-0 text-[var(--mk-muted)]" />
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="shrink-0"># Sales</span>
        <span className="text-[var(--mk-muted)]">/</span>
        <span className="truncate">Kickoff Call - Northbeam x Acme</span>
        <span className="ml-1 hidden shrink-0 rounded bg-[var(--mk-rec-tint)] px-1.5 text-[10px] font-semibold text-[var(--mk-green-ink)] sm:inline">
          REC
        </span>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {extra && (
          <span className="hidden items-center gap-1 text-[var(--mk-body)] md:inline-flex">
            <Icon name="mic" size={14} />
            {extra}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--mk-violet)] px-2 py-1 text-[11px] font-medium text-[var(--mk-white)]">
          <Icon name="globe" size={12} />
          Share
          <Icon name="link" size={12} className="hidden sm:block" />
        </span>
        <span className="hidden h-6 w-6 items-center justify-center rounded-md border border-[var(--mk-line)] sm:flex">
          <Icon name="plus" size={14} />
        </span>
        <Icon name="bell" size={16} className="hidden text-[var(--mk-muted)] sm:block" />
        <Avatar name="Sarah" tone={4} size={24} />
      </div>
    </div>
  );
}

export function TranscriptEntry({
  line,
  active = false,
}: {
  line: TranscriptLine;
  active?: boolean;
}) {
  return (
    <div className={`rounded-lg px-2 py-2 ${active ? "bg-[var(--mk-violet-tint)]" : ""}`}>
      <div className="flex items-center gap-1.5 text-[12px]">
        <Avatar name={line.speaker} tone={line.tone} size={16} />
        <span className="font-medium text-[var(--mk-ink)]">{line.speaker}</span>
        <Icon name="chevron-down" size={12} className="text-[var(--mk-muted)]" />
        <span className="text-[var(--mk-muted)]">·</span>
        <span className="text-[var(--mk-link)] underline underline-offset-2">{line.time}</span>
      </div>
      <p className="mt-1.5 pl-[22px] text-[12.5px] leading-relaxed text-[var(--mk-body)]">
        {line.text}
      </p>
    </div>
  );
}

/** Transcript column with search box, as on the meeting page. */
export function TranscriptPanel({
  lines = TRANSCRIPT,
  activeIndex = -1,
}: {
  lines?: TranscriptLine[];
  activeIndex?: number;
}) {
  return (
    <div className="flex h-full flex-col bg-[var(--mk-white)] text-left">
      <p className="px-4 pt-3 text-[12px] font-medium text-[var(--mk-ink)]">Transcript</p>
      <div className="mx-4 mt-3 flex items-center gap-2 rounded-md bg-[var(--mk-surface)] px-3 py-2 text-[12px] text-[var(--mk-muted)]">
        <Icon name="search" size={14} />
        Search
      </div>
      <div className="mt-2 space-y-1 px-2 pb-3">
        {lines.map((line, i) => (
          <TranscriptEntry
            key={`${line.speaker}-${line.time}`}
            line={line}
            active={i === activeIndex}
          />
        ))}
      </div>
    </div>
  );
}

/** Fake browser-ish frame that holds a mock-up. */
export function MockWindow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-[var(--mk-line)] bg-[var(--mk-white)] text-left shadow-[0_24px_70px_var(--mk-shadow-strong)] ${className}`}
    >
      {children}
    </div>
  );
}
