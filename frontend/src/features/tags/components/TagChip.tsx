import { cn } from "@/lib/utils/cn";

import { tagToneClass, type TagLike } from "../lib/color";

export type TagChipProps = {
  tag: TagLike;
  size?: "sm" | "md";
  className?: string;
};

/** A coloured, non-interactive tag pill in the tag's stored colour. */
export function TagChip({ tag, size = "md", className }: TagChipProps) {
  return (
    <span
      title={tag.name}
      className={cn(
        // inline-block, not flex: text-overflow only ellipsises a block's own text.
        "inline-block max-w-[160px] shrink-0 truncate whitespace-nowrap rounded-tag align-middle font-medium",
        size === "sm" ? "px-1.5 text-micro leading-[18px]" : "px-2 text-caption leading-[22px]",
        tagToneClass(tag),
        className,
      )}
    >
      {tag.name}
    </span>
  );
}
