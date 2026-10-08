import { describe, expect, it } from "vitest";

import { exportUrl } from "./api";
import { EmptyExportError, normalizeSections } from "./lib/options";

const query = (url: string) => new URL(url, "http://app.test").searchParams;

describe("exportUrl", () => {
  it("builds a same-origin, proxied path with format and sections", () => {
    const url = exportUrl(7, { format: "pdf", sections: ["summary", "transcript"] });
    expect(url.startsWith("/api/v1/meetings/7/export?")).toBe(true);
    expect(query(url).get("format")).toBe("pdf");
    expect(query(url).get("sections")).toBe("summary,transcript");
  });

  it("orders sections canonically, so one choice always gives one URL", () => {
    const a = exportUrl(1, { format: "md", sections: ["transcript", "action_items", "summary"] });
    const b = exportUrl(1, {
      format: "md",
      sections: new Set(["summary", "transcript", "action_items"] as const),
    });
    expect(a).toBe(b);
    expect(query(a).get("sections")).toBe("summary,action_items,transcript");
  });

  it("refuses an empty selection instead of sending a request the server rejects", () => {
    expect(() => exportUrl(1, { format: "txt", sections: [] })).toThrow(EmptyExportError);
  });
});

describe("normalizeSections", () => {
  it("dedupes and drops unknown names", () => {
    expect(normalizeSections(["summary", "summary", "bogus", "action_items"])).toEqual([
      "summary",
      "action_items",
    ]);
  });

  it("throws when nothing known is left", () => {
    expect(() => normalizeSections(["bogus"])).toThrow("Pick at least one section");
  });
});
