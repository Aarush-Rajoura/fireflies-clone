import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/*
 * tailwind-merge so a caller's `className` can override a primitive's defaults
 * (`<Button className="h-10">` wins over `h-9`). It must be told about our
 * custom font sizes; otherwise it treats `text-body` and `text-primary` as the
 * same colour group and silently drops one of them.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: ["display", "h2", "h3", "body", "body-strong", "title-row", "transcript", "label", "sm", "xs", "2xs"],
        },
      ],
      shadow: [{ shadow: ["xs", "sm", "md", "lg", "focus", "none"] }],
      rounded: [{ rounded: ["control"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
