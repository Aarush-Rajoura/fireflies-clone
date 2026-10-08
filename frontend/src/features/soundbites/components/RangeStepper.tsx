"use client";

import { Minus, Plus } from "lucide-react";

import { IconButton, formatTimestamp } from "@/components/ui";

export type RangeStepperProps = {
  label: string;
  ms: number;
  onChange: (ms: number) => void;
  min: number;
  max: number;
  stepMs?: number;
};

/** "Start  − 0:12 +": nudges a clip boundary by whole seconds within [min, max]. */
export function RangeStepper({ label, ms, onChange, min, max, stepMs = 1_000 }: RangeStepperProps) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5">
      <span className="text-label text-secondary">{label}</span>
      <div className="flex items-center gap-1">
        <IconButton
          label={`${label} 1 second earlier`}
          size="sm"
          variant="secondary"
          icon={<Minus strokeWidth={1.75} />}
          disabled={ms - stepMs < min}
          onClick={() => onChange(Math.max(min, ms - stepMs))}
        />
        <output aria-live="polite" className="tnum w-16 text-center text-body-strong text-primary">
          {formatTimestamp(ms)}
        </output>
        <IconButton
          label={`${label} 1 second later`}
          size="sm"
          variant="secondary"
          icon={<Plus strokeWidth={1.75} />}
          disabled={ms + stepMs > max}
          onClick={() => onChange(Math.min(max, ms + stepMs))}
        />
      </div>
    </div>
  );
}
