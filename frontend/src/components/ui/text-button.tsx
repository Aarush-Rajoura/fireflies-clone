import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export type TextButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** `accent` reads as a link; `plain` inherits the surrounding text colour (click-to-edit text). */
  tone?: "accent" | "plain";
};

/** An inline, link-style button that flows inside running text. */
export const TextButton = forwardRef<HTMLButtonElement, TextButtonProps>(function TextButton(
  { tone = "accent", className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline rounded-tag text-left transition-colors duration-fast disabled:pointer-events-none disabled:opacity-50",
        tone === "accent" ? "text-accent hover:underline" : "hover:bg-surface-hover",
        className,
      )}
      {...rest}
    />
  );
});
