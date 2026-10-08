import { unwrap, type ExportFormat } from "@/lib/api";
import { api } from "@/lib/api/client";

import { normalizeSections, type ExportSection } from "./lib/options";

export type ExportRequest = { format: ExportFormat; sections: Iterable<ExportSection> };

export type ExportFile = { blob: Blob; filename: string };

function exportQuery({ format, sections }: ExportRequest) {
  return { format, sections: normalizeSections(sections).join(",") };
}

/** The relative, proxied URL of an export, e.g. for a plain link. */
export function exportUrl(meetingId: number, request: ExportRequest): string {
  return `/api/v1/meetings/${meetingId}/export?${new URLSearchParams(exportQuery(request))}`;
}

/** `attachment; filename="x.md"` or RFC 5987 `filename*=UTF-8''x.md`; null when absent. */
export function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      // Malformed escapes: fall through to the plain parameter.
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  return plain?.[1]?.trim() || null;
}

/**
 * Fetches the file before anything is saved, so a 404/410/422/500 surfaces as
 * an ApiError the caller can report, instead of the browser saving an error
 * page as the "export". Exports are small text or PDF files, so holding one
 * in memory is fine.
 */
export async function fetchExport(meetingId: number, request: ExportRequest): Promise<ExportFile> {
  let filename = `meeting-${meetingId}.${request.format}`;
  const blob = await unwrap(
    api
      .GET("/api/v1/meetings/{meeting_id}/export", {
        params: { path: { meeting_id: meetingId }, query: exportQuery(request) },
        parseAs: "blob",
      })
      .then((result) => {
        filename =
          filenameFromDisposition(result.response.headers.get("content-disposition")) ?? filename;
        return result;
      }),
  );
  return { blob, filename };
}
