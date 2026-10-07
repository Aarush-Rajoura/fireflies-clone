import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tailwind from "eslint-plugin-tailwindcss";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/*
 * Features are islands with one public door: `@/features/<name>` (its
 * index.ts). Reaching past it couples features to each other's internals.
 */
const featureBoundaries = {
  files: ["src/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@/features/*/*", "@/features/*/**"],
            message: "Import a feature only through its index: `@/features/<name>`.",
          },
        ],
      },
    ],
  },
};

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
    // `tnum` is hand-written in globals.css, so the plugin cannot see it.
    "tailwindcss/no-custom-classname": ["error", { whitelist: ["tnum"] }],
    "tailwindcss/no-contradicting-classname": "error",
  },
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  featureBoundaries,
  tailwindEnforcement,
  {
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
