"use client";

import { Check } from "lucide-react";

import { Button, Menu, type MenuItem } from "@/components/ui";

import { usePlayerClockSelector } from "../hooks/usePlayerClock";
import { usePlayerControls } from "../hooks/usePlayerControls";

export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;

export function SpeedMenu() {
  const rate = usePlayerClockSelector((c) => c.rate);
  const { setRate } = usePlayerControls();

  const items: MenuItem[] = [
    { type: "label", label: "Playback speed" },
    ...PLAYBACK_RATES.map((r): MenuItem => ({
      label: `${r}×`,
      onSelect: () => setRate(r),
      trailing: r === rate ? <Check aria-label="Current speed" strokeWidth={1.75} /> : undefined,
    })),
  ];

  return (
    <Menu
      side="top"
      className="min-w-[160px]"
      items={items}
      trigger={
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Playback speed ${rate}×`}
          className="tnum px-2"
        >
          {rate}×
        </Button>
      }
    />
  );
}
