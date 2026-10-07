import type { Config } from "tailwindcss";

/*
 * The default palette, type scale, radii and shadows are REPLACED, not
 * extended: every utility resolves to a token in src/styles/tokens.css, so an
 * off-palette class like `bg-blue-500` simply does not exist (and the
 * tailwindcss/no-custom-classname lint rule reports it).
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
  // Lets 1px rules drawn as backgrounds (resize handles, menu separators) use the border colour.
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
  upgrade: { DEFAULT: v("upgrade"), text: v("upgrade-text") },
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
  secondary: v("text-secondary"),
  muted: v("text-muted"),
  inverse: v("text-inverse"),
  accent: { ...colors.accent, DEFAULT: v("accent-text") },
};

const borderColor = {
  ...colors,
  DEFAULT: v("border-subtle"),
  subtle: v("border-subtle"),
  strong: v("border-strong"),
};

// Function, not string: Tailwind runs ringColor.DEFAULT through an alpha helper
// that cannot parse var() and would otherwise fall back to a literal blue hex.
const ringDefault = (() => v("accent-border")) as unknown as string;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    colors,
    textColor,
    borderColor,
    divideColor: borderColor,
    ringColor: { ...colors, DEFAULT: ringDefault },
    ringOffsetColor: { DEFAULT: v("surface-0"), ...colors },
    fontFamily: {
      sans: [v("font-sans")],
      mono: [v("font-mono")],
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
      sm: ["13px", { lineHeight: "18px", fontWeight: "400" }],
      xs: ["12px", { lineHeight: "16px", fontWeight: "500" }],
      "2xs": ["10px", { lineHeight: "12px", fontWeight: "600" }],
    },
    borderRadius: {
      none: "0",
      xs: v("radius-xs"),
    control: v("radius-control"),
      sm: v("radius-sm"),
      md: v("radius-md"),
      lg: v("radius-lg"),
      full: v("radius-full"),
    },
    boxShadow: {
      none: "none",
      xs: v("shadow-xs"),
      sm: v("shadow-sm"),
      md: v("shadow-md"),
      lg: v("shadow-lg"),
      focus: v("shadow-focus"),
    },
    transitionDuration: {
      DEFAULT: v("dur-base"),
      fast: v("dur-fast"),
      base: v("dur-base"),
      slow: v("dur-slow"),
    },
    transitionTimingFunction: {
      DEFAULT: v("ease"),
      ff: v("ease"),
      linear: "linear",
    },
    extend: {
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
