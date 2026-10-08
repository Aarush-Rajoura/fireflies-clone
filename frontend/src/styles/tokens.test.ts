import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

import config from "../../tailwind.config";

const src = path.resolve(__dirname, "..");
const tokensCss = readFileSync(path.join(__dirname, "tokens.css"), "utf8");

function declared(block: string): Set<string> {
  return new Set([...block.matchAll(/(--ff-[\w-]+)\s*:/g)].map((m) => m[1] as string));
}

/** The body of the rule whose selector line is exactly `selector {`. */
function block(selector: string): string {
  const start = tokensCss.indexOf(`\n${selector} {`);
  if (start < 0) throw new Error(`missing ${selector}`);
  return tokensCss.slice(start, tokensCss.indexOf("\n}", start));
}

function referenced(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === "string") {
    for (const m of value.matchAll(/var\((--ff-[\w-]+)[,)]/g)) out.add(m[1] as string);
  } else if (typeof value === "function") {
    referenced((value as () => unknown)(), out);
  } else if (Array.isArray(value)) {
    value.forEach((v) => referenced(v, out));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => referenced(v, out));
  }
  return out;
}

const all = declared(tokensCss);
const dark = declared(block("[data-theme='dark']"));
const light = declared(block("[data-theme='light']"));

describe("design tokens", () => {
  test("every token the Tailwind theme uses is declared in tokens.css", () => {
    const used = referenced(config.theme);
    expect(used.size).toBeGreaterThan(40);
    expect([...used].filter((t) => !all.has(t))).toEqual([]);
  });

  test("dark and light declare the same semantic tokens, so either works standalone", () => {
    expect(dark.size).toBeGreaterThan(40);
    expect([...dark].filter((t) => !light.has(t))).toEqual([]);
    expect([...light].filter((t) => !dark.has(t))).toEqual([]);
  });

  test("no hex colour appears anywhere in src outside the two token files", () => {
    const allowed = new Set(["styles/tokens.css", "styles/marketing-tokens.css"]);
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        const rel = path.relative(src, full).split(path.sep).join("/");
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(tsx?|css)$/.test(name) && !allowed.has(rel)) {
          if (/#[0-9a-fA-F]{3,8}\b/.test(readFileSync(full, "utf8"))) offenders.push(rel);
        }
      }
    };
    walk(src);
    expect(offenders).toEqual([]);
  });
});
