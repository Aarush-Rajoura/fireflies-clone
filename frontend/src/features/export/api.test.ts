import { afterEach, describe, expect, it, vi } from "vitest";

import { exportUrl, fetchExport, filenameFromDisposition } from "./api";
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

describe("filenameFromDisposition", () => {
  it("reads quoted, bare and RFC 5987 filenames", () => {
    expect(filenameFromDisposition('attachment; filename="launch-2026.md"')).toBe("launch-2026.md");
    expect(filenameFromDisposition("attachment; filename=notes.txt")).toBe("notes.txt");
    expect(filenameFromDisposition("attachment; filename*=UTF-8''r%C3%A9union.pdf")).toBe(
      "réunion.pdf",
    );
    expect(filenameFromDisposition(null)).toBeNull();
  });
});

describe("fetchExport", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the file and the server's filename", async () => {
    const fetchMock = vi.fn<(req: Request) => Promise<Response>>(
      async () =>
        new Response("# Launch", {
          status: 200,
          headers: {
            "Content-Type": "text/markdown",
            "Content-Disposition": 'attachment; filename="launch.md"',
          },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const file = await fetchExport(7, { format: "md", sections: ["summary"] });
    expect(file.filename).toBe("launch.md");
    expect(await file.blob.text()).toBe("# Launch");
    const url = new URL(fetchMock.mock.calls[0]![0].url);
    expect(url.pathname).toBe("/api/v1/meetings/7/export");
    expect(url.searchParams.get("sections")).toBe("summary");
  });

  it("turns an error envelope into an ApiError instead of a file", async () => {
    const envelope = JSON.stringify({ error: { code: "GONE", message: "Deleted", details: {} } });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(envelope, { status: 410, headers: { "Content-Type": "application/json" } }),
      ),
    );
    await expect(fetchExport(7, { format: "pdf", sections: ["summary"] })).rejects.toMatchObject({
      status: 410,
      code: "GONE",
    });
  });
});
