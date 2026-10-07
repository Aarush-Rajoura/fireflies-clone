import type { Feature } from "./content";
import { Icon } from "./icons";

/** Plain line icon + title + body, as in the reference feature grids. */
export function FeatureItem({ feature, dark = false }: { feature: Feature; dark?: boolean }) {
  return (
    <div>
      <Icon
        name={feature.icon}
        size={20}
        className={dark ? "text-[var(--mk-violet-soft)]" : "text-[var(--mk-ink)]"}
      />
      <h3
        className={`mt-2.5 text-[15px] font-medium ${dark ? "text-[var(--mk-on-dark)]" : "text-[var(--mk-violet)]"}`}
      >
        {feature.title}
      </h3>
      <p
        className={`mt-1 text-[14px] leading-relaxed ${dark ? "text-[var(--mk-on-dark-muted)]" : "text-[var(--mk-body)]"}`}
      >
        {feature.body}
      </p>
    </div>
  );
}
