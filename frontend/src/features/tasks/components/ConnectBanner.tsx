import Link from "next/link";

/*
 * Small drawn marks that evoke common project-management apps without using
 * their logos: a dot cluster, slanted bars, a two-column board and a chevron.
 * Colours come from the speaker palette, so both themes stay on-token.
 */
function DotsMark() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
      <circle cx="10" cy="5.5" r="3.5" className="fill-current text-speaker-4" />
      <circle cx="5" cy="13.5" r="3.5" className="fill-current text-speaker-3" />
      <circle cx="15" cy="13.5" r="3.5" className="fill-current text-speaker-3" />
    </svg>
  );
}

function BarsMark() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
      <g strokeWidth="3.2" strokeLinecap="round">
        <path d="M3 15 L7 6" className="stroke-current text-speaker-4" />
        <path d="M9 15 L13 6" className="stroke-current text-speaker-2" />
      </g>
      <circle cx="16.5" cy="14" r="1.9" className="fill-current text-speaker-1" />
    </svg>
  );
}

function BoardMark() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
      <rect x="2" y="2" width="16" height="16" rx="3" className="fill-current text-speaker-5" />
      <rect
        x="4.5"
        y="4.5"
        width="4.5"
        height="10"
        rx="1"
        className="fill-current text-on-accent"
      />
      <rect x="11" y="4.5" width="4.5" height="6" rx="1" className="fill-current text-on-accent" />
    </svg>
  );
}

function ChevronMark() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
      <g fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8.5 L10 3.5 L16 8.5" className="stroke-current text-speaker-3" />
        <path d="M4 15.5 L10 11 L16 15.5" className="stroke-current text-speaker-0" />
      </g>
    </svg>
  );
}

const MARKS = [DotsMark, BarsMark, BoardMark, ChevronMark];

export const CONNECT_HREF = "/integrations?category=project-management";

/** "Send tasks to your work apps": the connections are simulated on the Integrations page. */
export function ConnectBanner() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-card bg-surface-2 p-2 pr-4">
      <div className="flex items-center gap-4 rounded-panel bg-surface-3 px-4 py-2.5">
        {MARKS.map((Mark, i) => (
          <Mark key={i} />
        ))}
      </div>
      <p className="min-w-0 flex-1 text-body text-primary">
        Automatically send all your tasks to your work apps.
      </p>
      <Link
        href={CONNECT_HREF}
        className="rounded-tag text-body-strong text-accent transition-colors duration-fast hover:underline"
      >
        Connect
      </Link>
    </div>
  );
}
