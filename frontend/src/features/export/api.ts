import type { ExportFormat } from "@/lib/api";

import { normalizeSections, type ExportSection } from "./lib/options";

export type ExportRequest = { format: ExportFormat; sections: Iterable<ExportSection> };

/**
 * The export endpoint answers with a file, not JSON, so it is fetched by the
 * browser's download manager rather than the typed client. The path is
 * relative: it goes through the same-origin /api proxy like every other call.
 */
export function exportUrl(meetingId: number, { format, sections }: ExportRequest): string {
  const query = new URLSearchParams({
    format,
    sections: normalizeSections(sections).join(","),
  });
  return `/api/v1/meetings/${meetingId}/export?${query.toString()}`;
}
