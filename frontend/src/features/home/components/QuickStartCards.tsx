"use client";

import { Calendar, ChevronRight, Plus, Upload } from "lucide-react";
import type { ReactNode } from "react";

import { Pressable } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

type Card = {
  key: "schedule" | "upload" | "capture";
  label: string;
  icon: ReactNode;
  // Literal class names so Tailwind can see them.
  fill: string;
  iconTone: string;
};

const CARDS: readonly Card[] = [
  {
    key: "schedule",
    label: "Schedule Meeting",
    icon: <Calendar strokeWidth={1.75} />,
    fill: "bg-qs-schedule",
    iconTone: "text-qs-schedule-icon",
  },
  {
    key: "upload",
    label: "Upload File",
    icon: <Upload strokeWidth={1.75} />,
    fill: "bg-qs-upload",
    iconTone: "text-qs-upload-icon",
  },
  {
    key: "capture",
    label: "Capture Meeting",
    icon: <Plus strokeWidth={1.75} />,
    fill: "bg-qs-capture",
    iconTone: "text-qs-capture-icon",
  },
];

export type QuickStartCardsProps = {
  onSchedule: () => void;
  onUpload: () => void;
  onCapture: () => void;
};

/** "Quick Start": three tinted cards that open the schedule, upload and capture flows. */
export function QuickStartCards({ onSchedule, onUpload, onCapture }: QuickStartCardsProps) {
  const handlers = { schedule: onSchedule, upload: onUpload, capture: onCapture };
  return (
    <section aria-labelledby="quick-start-heading" className="flex flex-col gap-2">
      <h2 id="quick-start-heading" className="text-[20px] font-semibold leading-7 text-strong">
        Quick Start
      </h2>
      <p className="text-[16px] leading-6 text-secondary">
        Capture your first meeting or upload a recording to see Fireflies in action.
      </p>
      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CARDS.map((card) => (
          <li key={card.key}>
            <Pressable
              onClick={handlers[card.key]}
              className={cn(
                "group flex h-[66px] w-full items-center gap-3 rounded-panel border border-subtle px-5 text-[17px] font-medium text-strong hover:border-strong",
                card.fill,
              )}
            >
              <span className={cn("flex [&_svg]:size-5", card.iconTone)} aria-hidden>
                {card.icon}
              </span>
              <span className="min-w-0 flex-1 truncate">{card.label}</span>
              <ChevronRight
                className="size-4 text-primary transition-transform duration-fast group-hover:translate-x-0.5"
                strokeWidth={1.75}
                aria-hidden
              />
            </Pressable>
          </li>
        ))}
      </ul>
    </section>
  );
}
