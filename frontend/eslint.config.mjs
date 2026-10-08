import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tailwind from "eslint-plugin-tailwindcss";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/*
 * Import boundaries, mirroring the backend's check_layering.py. ESLint keeps
 * only the last matching config's options for a rule, so each file set lists
 * the full union of the restrictions that apply to it.
 */
const featureDoor = [
  {
    // Features are islands with one public door: `@/features/<name>` (its index.ts).
    group: ["@/features/*/*", "@/features/*/**"],
    message: "Import a feature only through its index: `@/features/<name>`.",
  },
];
const httpClient = [
  {
    // Like repositories: only lib/api and each feature's api.ts do HTTP.
    group: ["openapi-fetch", "openapi-fetch/*", "@/lib/api/client"],
    message:
      "Only src/lib/api/** and src/features/*/api.ts may use the HTTP client. Use the feature's hooks.",
  },
];
const uiNoFeatures = [
  {
    group: ["@/features", "@/features/**"],
    message: "components/ui is the design system: it must not depend on features.",
  },
];
const pageNoClient = [
  {
    group: ["@/lib/api/client"],
    message: "Pages are thin controllers: compose features, never call the API client.",
  },
  { group: ["openapi-fetch", "openapi-fetch/*"], message: httpClient[0].message },
];
const restrict = (...groups) => ({
  "no-restricted-imports": ["error", { patterns: groups.flat() }],
});

const importBoundaries = [
  { files: ["src/**/*.{ts,tsx}"], rules: restrict(featureDoor) },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/api/**", "src/features/*/api.ts"],
    rules: restrict(featureDoor, httpClient),
  },
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: restrict(featureDoor, httpClient, uiNoFeatures),
  },
  { files: ["src/app/**/*.{ts,tsx}"], rules: restrict(featureDoor, pageNoClient) },
];

/*
 * The palette is replaced in tailwind.config.ts, but Tailwind silently emits
 * nothing for unknown classes. This rule turns an off-palette class such as
 * `bg-blue-500` into a lint error instead of a silent no-op.
 */
const tailwindEnforcement = {
  files: ["src/**/*.{ts,tsx}"],
  plugins: { tailwindcss: tailwind },
  settings: {
    tailwindcss: {
      // Absolute, because the plugin resolves tailwindcss relative to it.
      config: path.join(projectRoot, "tailwind.config.ts"),
      callees: ["cn", "clsx"],
    },
  },
  rules: {
    // Hand-written classes the plugin cannot see: `tnum` and `ff-app` (globals.css)
    // and the marketing site's `mk-*` helpers (marketing-tokens.css).
    "tailwindcss/no-custom-classname": ["error", { whitelist: ["tnum", "ff-app", "mk-.*"] }],
    "tailwindcss/no-contradicting-classname": "error",
  },
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ...importBoundaries,
  tailwindEnforcement,
  {
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "src/types/api.d.ts"]),
]);
