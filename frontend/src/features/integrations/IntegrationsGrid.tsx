import {
  Building2,
  CalendarDays,
  Hash,
  MessagesSquare,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

import { Button, SoonBadge } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

type Integration = { name: string; description: string; icon: LucideIcon; tint: string };

// Drawn with generic icons on a tinted tile: no third-party logo files.
const INTEGRATIONS: Integration[] = [
  {
    name: "Zoom",
    description: "Fred joins Zoom calls and takes notes.",
    icon: Video,
    tint: "text-speaker-5",
  },
  {
    name: "Google Meet",
    description: "Capture Google Meet calls automatically.",
    icon: Users,
    tint: "text-speaker-1",
  },
  {
    name: "Microsoft Teams",
    description: "Record and transcribe Teams meetings.",
    icon: MessagesSquare,
    tint: "text-speaker-6",
  },
  {
    name: "Calendar",
    description: "Auto-join meetings from your calendar.",
    icon: CalendarDays,
    tint: "text-speaker-2",
  },
  {
    name: "Slack",
    description: "Post summaries to a Slack channel.",
    icon: Hash,
    tint: "text-speaker-3",
  },
  {
    name: "CRM",
    description: "Sync notes and tasks to your CRM.",
    icon: Building2,
    tint: "text-speaker-0",
  },
];

export function IntegrationsGrid() {
  return (
    <section className="mx-auto w-full max-w-content px-6 py-8">
      <h2 className="text-h2 text-strong">Integrations</h2>
      <p className="mt-1 text-body text-secondary">
        Connect the tools you meet and work in. All integrations are coming soon.
      </p>
      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map(({ name, description, icon: Icon, tint }) => (
          <li
            key={name}
            className="flex flex-col gap-3 rounded-card border border-subtle bg-surface-1 p-5"
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-panel bg-surface-3",
                  tint,
                )}
              >
                <Icon className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <SoonBadge />
            </div>
            <div>
              <p className="text-body-strong text-strong">{name}</p>
              <p className="text-meta text-secondary">{description}</p>
            </div>
            <Button size="sm" disabled className="self-start">
              Connect
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
