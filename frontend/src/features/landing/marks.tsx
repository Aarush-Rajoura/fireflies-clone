// Drawn brand glyph plus generic placeholder marks. No third-party logos anywhere.
import type { Tone } from "./content";

export const toneVar = (tone: Tone) => `var(--mk-tone-${tone})`;

/** Our own glyph: three stacked rounded bars stepping from magenta to violet. */
export function BrandMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={className}>
      <rect x="3" y="3" width="18" height="5" rx="2.5" fill="var(--mk-magenta)" />
      <rect x="3" y="9.5" width="12.5" height="5" rx="2.5" fill="var(--mk-plum)" />
      <rect x="3" y="16" width="6.5" height="5" rx="2.5" fill="var(--mk-violet)" />
    </svg>
  );
}

export function Wordmark({ dark = true, className = "" }: { dark?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BrandMark size={26} />
      <span
        className={`mk-display text-[19px] font-medium tracking-tight ${
          dark ? "text-[var(--mk-on-dark)]" : "text-[var(--mk-ink)]"
        }`}
      >
        fireflies.ai
      </span>
    </span>
  );
}

/** Abstract shapes standing in for customer and integration logos. */
export function PlaceholderMark({ shape, tone, size = 28 }: { shape: number; tone: Tone; size?: number }) {
  const c = toneVar(tone);
  const shapes = [
    <g key="0" fill={c}>
      <circle cx="9" cy="12" r="6" opacity="0.9" />
      <circle cx="15" cy="12" r="6" opacity="0.55" />
    </g>,
    <g key="1" fill={c}>
      <rect x="5" y="5" width="14" height="14" rx="3" transform="rotate(45 12 12)" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="var(--mk-white)" transform="rotate(45 12 12)" />
    </g>,
    <g key="2" fill="none" stroke={c} strokeWidth="2.5">
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="2.5" fill={c} />
    </g>,
    <g key="3" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 9l7-5 7 5M5 15l7-5 7 5M5 21l7-5 7 5" />
    </g>,
    <g key="4" fill="none" stroke={c} strokeWidth="2">
      <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-25 12 12)" />
      <circle cx="12" cy="12" r="4" fill={c} />
    </g>,
    <g key="5" fill={c}>
      <path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" />
      <path d="M12 8l3.5 2v4L12 16l-3.5-2v-4z" fill="var(--mk-white)" opacity="0.85" />
    </g>,
  ];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      {shapes[shape % shapes.length]}
    </svg>
  );
}

/** Round initial avatar used in transcript and meeting mock-ups. */
export function Avatar({ name, tone, size = 20 }: { name: string; tone: Tone; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-md font-semibold text-[var(--mk-white)]"
      style={{ width: size, height: size, background: toneVar(tone), fontSize: size * 0.5 }}
    >
      {name.charAt(0)}
    </span>
  );
}

/** Friendly robot face for "Fred", the support assistant. */
export function FredAvatar({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--mk-violet-tint)]"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62}>
        <path d="M9 4.5l1 2.5M15 4.5l-1 2.5" stroke="var(--mk-violet)" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="4" y="7" width="16" height="12" rx="6" fill="var(--mk-violet)" />
        <rect x="6.5" y="10" width="11" height="6" rx="3" fill="var(--mk-navy)" />
        <circle cx="9.7" cy="13" r="1.2" fill="var(--mk-violet-soft)" />
        <circle cx="14.3" cy="13" r="1.2" fill="var(--mk-violet-soft)" />
      </svg>
    </span>
  );
}
