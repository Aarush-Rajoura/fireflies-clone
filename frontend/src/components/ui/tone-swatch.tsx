import { Check } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

import { toneClasses, type HighlightTone } from "./highlighter";

export type ToneSwatchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  tone: HighlightTone;
  /** Accessible name, e.g. "Highlight yellow". */
  label: string;
  selected?: boolean;
};

/** A round colour button for picking a highlight tone. */
export function ToneSwatch({
  tone,
  label,
  selected = false,
  className,
  type = "button",
  ...rest
}: ToneSwatchProps) {
  return (
    <button
      type={type}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full border border-strong text-strong transition-transform duration-fast hover:scale-110 focus-visible:shadow-focus [&_svg]:size-3.5",
        toneClasses[tone],
        selected && "border-accent",
        className,
      )}
      {...rest}
    >
      {selected && <Check strokeWidth={2.5} aria-hidden />}
    </button>
  );
}
