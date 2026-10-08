import type { Config } from "tailwindcss";

/*
 * Colours are REPLACED: every colour utility resolves to a token in
 * src/styles/tokens.css, so an off-palette class like `bg-blue-500` does not
 * exist (and tailwindcss/no-custom-classname reports it). The marketing site
 * styles colours with its own `--mk-*` variables, so it is unaffected.
 *
 * Type, radius, shadow and motion EXTEND Tailwind's defaults under distinct
 * names (`text-body`, `rounded-control`, `shadow-overlay`, `duration-fast`), so
 * stock classes the marketing site uses (`text-lg`, `rounded-xl`, ...) keep
 * their original values.
 */

const v = (name: string) => `var(--ff-${name})`;

const colors = {
  transparent: "transparent",
  current: "currentColor",
  surface: {
    0: v("surface-0"),
    1: v("surface-1"),
    2: v("surface-2"),
    3: v("surface-3"),
    hover: v("surface-hover"),
    selected: v("surface-selected"),
    sunken: v("surface-sunken"),
  },
  skeleton: v("skeleton"),
  // Lets 1px rules drawn as backgrounds (resize handles, separators) use the border colour.
  divider: v("border-subtle"),
  accent: {
    DEFAULT: v("accent"),
    hover: v("accent-hover"),
    pressed: v("accent-pressed"),
    subtle: v("accent-subtle"),
    faint: v("accent-faint"),
    text: v("accent-text"),
    border: v("accent-border"),
  },
  success: { DEFAULT: v("success"), subtle: v("success-subtle"), strong: v("success-strong") },
  warning: { DEFAULT: v("warning"), subtle: v("warning-subtle"), strong: v("warning-strong") },
  danger: {
    DEFAULT: v("danger"),
    hover: v("danger-hover"),
    subtle: v("danger-subtle"),
    strong: v("danger-strong"),
  },
  upgrade: { DEFAULT: v("upgrade"), hover: v("upgrade-hover"), text: v("upgrade-text") },
  fab: { DEFAULT: v("fab"), text: v("fab-text"), border: v("fab-border") },
  count: v("count"),
  highlight: { DEFAULT: v("highlight"), active: v("highlight-active") },
  tint: { rose: v("tint-rose"), teal: v("tint-teal"), violet: v("tint-violet") },
  speaker: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i, v(`speaker-${i}`)])),
  avatar: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i, v(`avatar-${i}`)])),
  brand: { mark: v("brand-mark") },
  scrim: v("scrim"),
  "on-accent": v("text-on-accent"),
};

// Text roles live only on `text-*` so the utility reads `text-primary`, and
// `text-accent` means the lifted accent that stays legible on dark surfaces.
const textColor = {
  ...colors,
  strong: v("text-strong"),
  primary: v("text-primary"),
  menu: v("text-menu"),
  secondary: v("text-secondary"),
  muted: v("text-muted"),
  inverse: v("text-inverse"),
  accent: { ...colors.accent, DEFAULT: v("accent-text") },
};

const borderColor = {
  ...colors,
  // Outside the app no theme is set, so fall back to Tailwind's stock border.
  DEFAULT: "var(--ff-border-subtle, var(--ff-stock-border))",
  subtle: v("border-subtle"),
  control: v("border-control"),
  strong: v("border-strong"),
};

// Functions, not strings: Tailwind runs these DEFAULTs through an alpha helper
// that cannot parse var() and would otherwise emit a literal hex.
const fn = (value: string) => (() => value) as unknown as string;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    colors,
    textColor,
    borderColor,
    divideColor: borderColor,
    ringColor: { ...colors, DEFAULT: fn("var(--ff-accent-border, var(--ff-stock-ring))") },
    ringOffsetColor: { ...colors, DEFAULT: fn("var(--ff-surface-0, var(--ff-stock-ring-offset))") },
    extend: {
      fontFamily: {
        app: [v("font-sans")],
      },
      fontSize: {
        display: ["28px", { lineHeight: "36px", fontWeight: "600", letterSpacing: "-0.01em" }],
        h2: ["20px", { lineHeight: "28px", fontWeight: "600" }],
        h3: ["16px", { lineHeight: "24px", fontWeight: "600" }],
        body: ["14px", { lineHeight: "22px", fontWeight: "400" }],
        "body-strong": ["14px", { lineHeight: "22px", fontWeight: "500" }],
        "title-row": ["15px", { lineHeight: "22px", fontWeight: "600" }],
        transcript: ["15px", { lineHeight: "26px", fontWeight: "400" }],
        label: ["12px", { lineHeight: "16px", fontWeight: "600" }],
        meta: ["13px", { lineHeight: "18px", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "16px", fontWeight: "500" }],
        micro: ["10px", { lineHeight: "12px", fontWeight: "600" }],
      },
      borderRadius: {
        tag: v("radius-xs"), //        3px: checkboxes, badges
        control: v("radius-control"), // 4px: buttons, inputs
        item: v("radius-sm"), //       6px: menu items, tracks, tooltips
        panel: v("radius-md"), //      8px: menus, popovers, toasts
        card: v("radius-lg"), //      12px: cards, modals
      },
      boxShadow: {
        hairline: v("shadow-xs"),
        raised: v("shadow-sm"),
        popover: v("shadow-md"),
        overlay: v("shadow-lg"),
        focus: v("shadow-focus"),
      },
      transitionDuration: {
        fast: v("dur-fast"),
        base: v("dur-base"),
        slow: v("dur-slow"),
      },
      transitionTimingFunction: {
        ff: v("ease"),
      },
      // App-shell and control sizes, named so layouts don't sprinkle magic numbers.
      spacing: {
        topbar: "56px",
        rail: "64px",
        "rail-mini": "48px",
        sidebar: "300px",
        "ask-panel": "520px",
        "btn-sm": "32px",
        "btn-md": "36px",
        input: "40px",
        "avatar-sm": "24px",
        "avatar-md": "32px",
        "avatar-lg": "40px",
        toast: "380px",
      },
      maxWidth: {
        "modal-sm": "440px",
        "modal-md": "560px",
        "modal-lg": "720px",
        toast: "380px",
        content: "1024px",
      },
      zIndex: {
        topbar: "40",
        modal: "50",
        popover: "55",
        toast: "60",
      },
      keyframes: {
        shimmer: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.55" } },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        shimmer: "shimmer 1.6s ease-in-out infinite",
        "toast-in": "toast-in var(--ff-dur-base) var(--ff-ease)",
        "fade-in": "fade-in var(--ff-dur-fast) var(--ff-ease)",
      },
    },
  },
  plugins: [],
};

export default config;
