import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export type SliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Required: a slider has no visible text, so the name comes from here. */
  "aria-label": string;
};

/** A native range input (keyboard and touch for free) with the app accent. */
export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  { className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type="range"
      className={cn("cursor-pointer accent-accent", className)}
      {...rest}
    />
  );
});
