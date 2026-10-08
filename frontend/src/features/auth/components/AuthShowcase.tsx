import { CheckCircle2, Circle, Search, Sparkles } from "lucide-react";

import { AvatarGroup, Badge } from "@/components/ui";

const HIGHLIGHTS = [
  { icon: Sparkles, text: "AI summaries, outlines and action items after every call" },
  { icon: Search, text: "Search every conversation and jump to the exact moment" },
  { icon: CheckCircle2, text: "Recaps sent to the right people automatically" },
];

const TASKS = [
  { done: true, text: "Share the launch checklist with Sales" },
  { done: false, text: "Book design review for the onboarding flow" },
];

/** Right-hand panel: an illustrative meeting recap, not real data. */
export function AuthShowcase() {
  return (
    <div className="relative flex h-full flex-col justify-center gap-10 overflow-hidden px-10 py-12 xl:px-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-accent-faint blur-3xl"
      />
      <div className="relative flex max-w-md flex-col gap-3">
        <Badge tone="accent" className="self-start">
          Meet Fred, your AI notetaker
        </Badge>
        <p className="text-display text-strong">Focus on the conversation. Fred takes the notes.</p>
      </div>

      <figure
        aria-label="Example meeting recap"
        className="relative flex max-w-md flex-col gap-4 rounded-card border border-subtle bg-surface-1 p-5 shadow-overlay"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-title-row text-strong">Q3 roadmap review</p>
            <p className="text-meta text-muted">Today · 32 min</p>
          </div>
          <AvatarGroup names={["Priya Shah", "Marco Diaz", "Lena Park"]} size="sm" />
        </div>
        <div className="flex flex-col gap-1.5 rounded-panel bg-surface-2 p-3">
          <p className="text-label text-accent">Overview</p>
          <p className="text-body text-secondary">
            The team agreed to ship onboarding in two phases, with analytics following in August
            once the pilot data is in.
          </p>
        </div>
        <ul className="flex flex-col gap-2" aria-label="Action items">
          {TASKS.map((t) => {
            const Icon = t.done ? CheckCircle2 : Circle;
            return (
              <li key={t.text} className="flex items-center gap-2 text-body text-primary">
                <Icon
                  className={t.done ? "size-4 text-success" : "size-4 text-muted"}
                  strokeWidth={1.75}
                  aria-hidden
                />
                {t.text}
              </li>
            );
          })}
        </ul>
      </figure>

      <ul className="relative flex max-w-md flex-col gap-3">
        {HIGHLIGHTS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-body text-secondary">
            <Icon className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.75} aria-hidden />
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}
