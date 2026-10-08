"use client";

import { ListFilter } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Badge, Button, Chip, DatePicker, Input, Popover } from "@/components/ui";
import { TagFilter } from "@/features/tags";
import { cn } from "@/lib/utils/cn";

import { DATE_PRESETS, presetRange, recognizePreset, type DatePreset } from "../lib/date-presets";
import type { MeetingsParams } from "../lib/params";

export type FilterValues = Pick<MeetingsParams, "participant" | "date_from" | "date_to" | "tag">;

export type FiltersPopoverProps = {
  value: FilterValues;
  activeCount: number;
  onApply: (next: FilterValues) => void;
};

/** "Filters" button + panel. Edits a draft; the URL changes only on Apply, as one Back step. */
export function FiltersPopover({ value, activeCount, onApply }: FiltersPopoverProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label="Filters"
      className="w-[360px] p-4"
      trigger={
        <Button
          leadingIcon={<ListFilter strokeWidth={1.75} />}
          aria-label={activeCount ? `Filters, ${activeCount} active` : "Filters"}
          className={cn(activeCount > 0 && "border-accent-border text-accent")}
        >
          {/* Icon-only on narrower lists, where the open search box needs the room. */}
          <span className="hidden min-[1400px]:inline">Filters</span>
          {activeCount > 0 && <Badge tone="accent">{activeCount}</Badge>}
        </Button>
      }
    >
      {/* Mounted only while open, so each opening starts from the applied state. */}
      {open && (
        <FiltersForm
          initial={value}
          onApply={(next) => {
            onApply(next);
            setOpen(false);
          }}
        />
      )}
    </Popover>
  );
}

function FiltersForm({
  initial,
  onApply,
}: {
  initial: FilterValues;
  onApply: (v: FilterValues) => void;
}) {
  const [participant, setParticipant] = useState(initial.participant ?? "");
  const [preset, setPreset] = useState<DatePreset>(() => recognizePreset(initial));
  const [from, setFrom] = useState(initial.date_from ?? "");
  const [to, setTo] = useState(initial.date_to ?? "");
  const [tags, setTags] = useState<number[]>(initial.tag ?? []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const range =
      preset === "custom"
        ? { date_from: from || undefined, date_to: to || undefined }
        : presetRange(preset);
    onApply({
      participant: participant.trim() || undefined,
      ...range,
      tag: tags.length ? tags : undefined,
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-participant" className="text-label text-secondary">
          Participant
        </label>
        <Input
          id="filter-participant"
          placeholder="Name contains…"
          value={participant}
          onChange={(e) => setParticipant(e.target.value)}
        />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-label text-secondary">Date</legend>
        <div role="group" aria-label="Date range" className="flex flex-wrap gap-1.5">
          {DATE_PRESETS.map((p) => (
            <Chip
              key={p.id}
              selected={preset === p.id}
              onClick={() => setPreset(p.id)}
              className="h-btn-sm px-2.5 text-meta"
            >
              {p.label}
            </Chip>
          ))}
        </div>
        {preset === "custom" && (
          <div className="mt-2 flex items-center gap-2">
            <DatePicker
              label="From"
              value={from}
              max={to || undefined}
              onChange={setFrom}
              className="min-w-0 flex-1 px-2"
            />
            <span className="text-meta text-muted">to</span>
            <DatePicker
              label="To"
              value={to}
              min={from || undefined}
              onChange={setTo}
              className="min-w-0 flex-1 px-2"
            />
          </div>
        )}
      </fieldset>

      <TagFilter value={tags} onChange={setTags} />

      <div className="flex justify-between gap-2 border-t border-subtle pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onApply({
              participant: undefined,
              date_from: undefined,
              date_to: undefined,
              tag: undefined,
            })
          }
        >
          Clear all
        </Button>
        <Button type="submit" variant="primary" size="sm">
          Apply
        </Button>
      </div>
    </form>
  );
}
