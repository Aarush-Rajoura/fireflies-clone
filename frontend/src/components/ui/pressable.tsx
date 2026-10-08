import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export type PressableProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Adds nothing but the native button: callers own every class (marketing pages, custom triggers). */
  bare?: boolean;
};

/**
 * An unstyled button for custom clickable surfaces (cards, thumbnails, list
 * rows) that are not shaped like a <Button>. It keeps native button semantics
 * and the app-wide focus ring; callers supply every visual.
 */
export const Pressable = forwardRef<HTMLButtonElement, PressableProps>(function Pressable(
  { className, type = "button", bare = false, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={
        bare
          ? className
          : cn(
              "text-left transition-colors duration-fast disabled:pointer-events-none disabled:opacity-50",
              className,
            )
      }
      {...rest}
    />
  );
});
