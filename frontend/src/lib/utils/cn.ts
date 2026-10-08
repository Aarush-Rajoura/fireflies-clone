import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/*
 * tailwind-merge so a caller's `className` can override a primitive's defaults
 * (`<Button className="h-10">` wins over `h-9`). It must be told about our
 * custom scale names; otherwise it treats `text-body` and `text-primary` as the
 * same colour group and silently drops one of them.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: ["display", "h2", "h3", "body", "body-strong", "title-row", "transcript", "label", "meta", "caption", "micro"],
        },
      ],
      shadow: [{ shadow: ["hairline", "raised", "popover", "overlay", "focus"] }],
      rounded: [{ rounded: ["tag", "control", "item", "panel", "card"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
