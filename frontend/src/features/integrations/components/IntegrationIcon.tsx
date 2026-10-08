import { cn } from "@/lib/utils/cn";

import { monogramFill, monogramLetters } from "../lib/monogram";

export type IntegrationIconProps = {
  integrationKey: string;
  name: string;
  size?: "md" | "lg";
  className?: string;
};

/** A drawn letter tile standing in for the vendor's logo. Decorative: the name is always beside it. */
export function IntegrationIcon({
  integrationKey,
  name,
  size = "md",
  className,
}: IntegrationIconProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-panel font-semibold leading-none tracking-wide text-on-accent shadow-hairline",
        size === "lg" ? "size-14 text-h3" : "size-10 text-body-strong",
        monogramFill(integrationKey),
        className,
      )}
    >
      {monogramLetters(name)}
    </span>
  );
}
