import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

import config from "../../tailwind.config";

const root = path.resolve(__dirname, "..", "..");
const tokensCss = readFileSync(path.join(__dirname, "tokens.css"), "utf8");

function declared(block: string): Set<string> {
  return new Set([...block.matchAll(/(--ff-[\w-]+)\s*:/g)].map((m) => m[1] as string));
}

function referenced(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === "string") {
    for (const m of value.matchAll(/var\((--ff-[\w-]+)\)/g)) out.add(m[1] as string);
  } else if (typeof value === "function") {
    referenced((value as () => unknown)(), out);
  } else if (Array.isArray(value)) {
    value.forEach((v) => referenced(v, out));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => referenced(v, out));
  }
  return out;
}

const [darkBlock = "", lightBlock = ""] = tokensCss.split("[data-theme='light']");
const darkTokens = declared(darkBlock);
const lightTokens = declared(lightBlock);

describe("design tokens", () => {
  test("every token the Tailwind theme uses is declared in tokens.css", () => {
    const used = referenced(config.theme);
    expect(used.size).toBeGreaterThan(40);
    const missing = [...used].filter((t) => !darkTokens.has(t));
    expect(missing).toEqual([]);
  });

  test("the light theme only re-points tokens that exist in the dark default", () => {
    const orphaned = [...lightTokens].filter((t) => !darkTokens.has(t));
    expect(orphaned).toEqual([]);
  });

  test("no hex colour appears in source outside tokens.css", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(tsx?|css)$/.test(name) && !/tokens\.(css|test\.ts)$/.test(name)) {
          // Marketing has its own token file, owned separately.
          if (name === "marketing-tokens.css") continue;
          if (/#[0-9a-fA-F]{3,8}\b/.test(readFileSync(full, "utf8").replace(/&#\d+;/g, ""))) {
            offenders.push(path.relative(root, full));
          }
        }
      }
    };
    walk(path.join(root, "src", "components", "ui"));
    walk(path.join(root, "src", "lib"));
    expect(offenders).toEqual([]);
  });
});
