import { MEETING_NOTES } from "./content";
import { Icon, type IconName } from "./icons";
import { Avatar, BrandMark } from "./marks";
import { MockTopBar, MockWindow, TranscriptPanel } from "./mockParts";

const RAIL: IconName[] = ["search", "sparkles", "target", "message", "bookmark"];

/** Static rendering of the meeting page: notes on the left, transcript on the right. */
export function ProductMock() {
  return (
    <figure aria-label="Fireflies meeting page showing AI notes and a live transcript" className="relative mx-auto max-w-[1040px]">
      <MockWindow className="rounded-t-none sm:rounded-t-xl">
        <MockTopBar />
        <div className="grid md:grid-cols-[44px_minmax(0,1fr)_300px]">
          <div className="hidden flex-col items-center gap-5 border-r border-[var(--mk-line)] pt-4 text-[var(--mk-muted)] md:flex">
            {RAIL.map((name) => (
              <Icon key={name} name={name} size={16} />
            ))}
          </div>

          <div className="px-5 py-6 sm:px-10 sm:py-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mk-display text-[18px] font-medium text-[var(--mk-ink)] sm:text-[22px]">
                  Kickoff Call - Northbeam x Acme
                </p>
                <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[var(--mk-muted)]">
                  <Avatar name="Sarah" tone={4} size={14} /> Sarah Watts, +3 · Mar 15 · 11:30 AM
                </p>
              </div>
              <span className="hidden items-center gap-1.5 rounded-md border border-[var(--mk-line)] px-2.5 py-1.5 text-[12px] text-[var(--mk-body)] sm:inline-flex">
                <Icon name="video" size={14} /> Video
              </span>
            </div>

            <div className="mt-6 flex items-center justify-between text-[12px]">
              <span className="inline-flex items-center gap-1.5 font-medium text-[var(--mk-violet)]">
                <Icon name="sparkles" size={14} /> Sales Notes
                <Icon name="chevron-down" size={12} />
              </span>
              <span className="inline-flex items-center gap-1 text-[var(--mk-body)]">
                <Icon name="plus" size={12} /> AI Apps
              </span>
            </div>

            <p className="mt-5 text-[13px] font-medium text-[var(--mk-ink)]">Overview</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--mk-body)]">
              The kickoff introduced Northbeam and Acme. Acme plans to use Fireflies to streamline internal
              communication, automate sales follow-ups and improve meeting workflows.
            </p>

            <p className="mt-6 text-[13px] font-medium text-[var(--mk-ink)]">Notes</p>
            <div className="mt-2 space-y-3">
              {MEETING_NOTES.map((note) => (
                <div key={note.heading}>
                  <p className="flex items-center gap-2.5 text-[13px] font-medium text-[var(--mk-ink)]">
                    <span aria-hidden="true" className="h-3 w-3 rounded-sm bg-[var(--mk-secondary)]" />
                    {note.heading}: <span className="font-normal text-[var(--mk-body)]">{note.range}</span>
                  </p>
                  <ul className="mt-1.5 space-y-1 pl-6">
                    {note.bullets.map((b) => (
                      <li key={b} className="list-disc text-[12.5px] leading-relaxed text-[var(--mk-body)] marker:text-[var(--mk-muted)]">
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden border-l border-[var(--mk-line)] md:block">
            <TranscriptPanel />
            <NotetakerCard />
          </div>
        </div>
      </MockWindow>
    </figure>
  );
}

/** The bot "tile" that appears in the call while it records. */
function NotetakerCard() {
  return (
    <div className="absolute bottom-6 right-4 w-[180px] overflow-hidden rounded-xl border-2 border-[var(--mk-violet)] bg-[var(--mk-navy)] p-3 shadow-[0_16px_40px_var(--mk-shadow-strong)]">
      <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--mk-violet)] text-[var(--mk-white)]">
        <Icon name="mic" size={10} />
      </span>
      <div className="flex justify-center py-3">
        <span className="mk-pulse flex h-16 w-16 items-center justify-center rounded-full bg-[var(--mk-navy-raised)] ring-2 ring-[var(--mk-magenta)]">
          <BrandMark size={26} />
        </span>
      </div>
      <p className="text-[11px] font-medium text-[var(--mk-on-dark)]">Sarah&apos;s Fireflies AI Notetaker</p>
    </div>
  );
}
