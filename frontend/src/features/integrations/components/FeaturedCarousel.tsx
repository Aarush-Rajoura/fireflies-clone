"use client";

import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sheet,
  Sparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Button, IconButton, PagerDots } from "@/components/ui";
import type { Integration, IntegrationCategory } from "@/lib/api";

import { useCarousel } from "../hooks/useCarousel";

import { ChatMock, CrmMock, SpreadsheetMock } from "./SlideMocks";

type Slide = {
  id: string;
  icon: LucideIcon;
  title: string;
  isNew?: boolean;
  body: string;
  note?: string;
  /** The catalogue entry the slide's button connects; slides without one browse a category. */
  integrationKey?: string;
  browse?: { category: IntegrationCategory; label: string };
  mock: ReactNode;
};

const SLIDES: readonly [Slide, ...Slide[]] = [
  {
    id: "mcp",
    icon: Sparkles,
    title: "Meeting MCP for AI assistants",
    isNew: true,
    body: "Ask your AI assistant anything about your meetings: surface insights, track action items and search past calls.",
    note: "*Works with any assistant that supports MCP.",
    integrationKey: "meeting-mcp",
    mock: <ChatMock />,
  },
  {
    id: "export",
    icon: Sheet,
    title: "Export meetings to spreadsheets",
    body: "Send meetings, owners and action items to a spreadsheet as rows, ready for pivot tables and weekly reporting.",
    integrationKey: "google-sheets",
    mock: <SpreadsheetMock />,
  },
  {
    id: "crm",
    icon: Workflow,
    title: "Keep your CRM in sync",
    body: "Log summaries, next steps and deal updates against the right contacts automatically after every call.",
    browse: { category: "crm", label: "Browse CRM integrations" },
    mock: <CrmMock />,
  },
];

export type FeaturedCarouselProps = {
  /** Catalogue entries by key, for the connect buttons; missing while loading. */
  byKey: ReadonlyMap<string, Integration>;
  onConnect: (integration: Integration) => void;
  onBrowse: (category: IntegrationCategory) => void;
};

export function FeaturedCarousel({ byKey, onConnect, onBrowse }: FeaturedCarouselProps) {
  const { index, goTo, paused, pauseHandlers } = useCarousel(SLIDES.length);
  const slide = SLIDES[index] ?? SLIDES[0];
  const target = slide.integrationKey ? byKey.get(slide.integrationKey) : undefined;
  const Icon = slide.icon;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured integrations"
      className="border-b border-subtle bg-surface-1"
      {...pauseHandlers}
    >
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-6 pb-5 pt-12">
        <div
          key={slide.id}
          role="group"
          aria-roledescription="slide"
          aria-label={`${index + 1} of ${SLIDES.length}: ${slide.title}`}
          // Announce only changes the user caused; an auto-rotating region would talk over them.
          aria-live={paused ? "polite" : "off"}
          className="grid min-h-[230px] animate-fade-in items-center gap-10 lg:grid-cols-[1fr_auto]"
        >
          <div className="flex gap-8">
            <span className="hidden size-16 shrink-0 items-center justify-center rounded-card bg-surface-3 text-accent sm:flex">
              <Icon className="size-8" strokeWidth={1.75} aria-hidden />
            </span>
            <div className="flex max-w-[520px] flex-col items-start gap-3">
              <h2 className="flex items-center gap-3 text-h2 text-strong">
                {slide.title}
                {slide.isNew && <Badge tone="success">New</Badge>}
              </h2>
              <p className="text-body text-primary">{slide.body}</p>
              <div className="mt-3">
                {slide.browse ? (
                  <Button
                    variant="primary"
                    trailingIcon={<ArrowRight strokeWidth={1.75} />}
                    onClick={() => slide.browse && onBrowse(slide.browse.category)}
                  >
                    {slide.browse.label}
                  </Button>
                ) : target?.connected ? (
                  <Badge tone="success" className="h-btn-md gap-1.5 px-3 text-body normal-case">
                    <Check className="size-4" strokeWidth={1.75} aria-hidden />
                    Connected
                  </Badge>
                ) : (
                  <Button
                    variant="primary"
                    leadingIcon={<Plus strokeWidth={1.75} />}
                    disabled={!target}
                    onClick={() => target && onConnect(target)}
                  >
                    {slide.id === "mcp" ? "Connect" : `Connect ${target?.name ?? ""}`.trim()}
                  </Button>
                )}
              </div>
              {slide.note && <p className="text-meta text-secondary">{slide.note}</p>}
            </div>
          </div>
          <div className="hidden justify-end md:flex">{slide.mock}</div>
        </div>
        <div className="flex items-center justify-center gap-2">
          <IconButton
            size="sm"
            label="Previous featured integration"
            icon={<ChevronLeft strokeWidth={1.75} />}
            onClick={() => goTo(index - 1)}
          />
          <PagerDots
            count={SLIDES.length}
            index={index}
            onSelect={goTo}
            itemLabel={(i) => `Show featured integration ${i + 1}: ${SLIDES[i]?.title ?? ""}`}
          />
          <IconButton
            size="sm"
            label="Next featured integration"
            icon={<ChevronRight strokeWidth={1.75} />}
            onClick={() => goTo(index + 1)}
          />
        </div>
      </div>
    </section>
  );
}
