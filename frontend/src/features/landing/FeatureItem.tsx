import type { Feature } from "./content";
import { Icon } from "./icons";

/** Icon + title + body block used in the feature grids. */
export function FeatureItem({ feature, dark = false }: { feature: Feature; dark?: boolean }) {
  return (
    <div>
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          dark ? "bg-[var(--mk-white-08)] text-[var(--mk-violet-soft)]" : "bg-[var(--mk-violet-tint)] text-[var(--mk-violet)]"
        }`}
      >
        <Icon name={feature.icon} size={19} />
      </span>
      <h3 className={`mt-3 text-[16px] font-medium ${dark ? "text-[var(--mk-on-dark)]" : "text-[var(--mk-ink)]"}`}>
        {feature.title}
      </h3>
      <p className={`mt-1.5 text-[15px] leading-relaxed ${dark ? "text-[var(--mk-on-dark-muted)]" : "text-[var(--mk-body)]"}`}>
        {feature.body}
      </p>
    </div>
  );
}
