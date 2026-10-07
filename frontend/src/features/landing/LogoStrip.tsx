import { LOGO_STRIP } from "./content";
import { PlaceholderMark } from "./marks";

/** Social-proof strip. Names and marks are invented placeholders, not real customers. */
export function LogoStrip() {
  return (
    <div className="mt-16 sm:mt-20">
      <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[var(--mk-on-dark)]">
        Used across <span className="text-[var(--mk-violet-soft)]">1 million+</span> companies
      </p>
      <ul className="mx-auto mt-8 grid max-w-[1040px] grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
        {LOGO_STRIP.map((logo) => (
          <li
            key={logo.name}
            className="flex items-center justify-center gap-2 text-[var(--mk-on-dark-muted)] opacity-90 grayscale-[35%]"
          >
            <PlaceholderMark shape={logo.shape} tone={logo.tone} size={24} />
            <span className="mk-display whitespace-nowrap text-[17px] font-semibold tracking-tight">
              {logo.name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
