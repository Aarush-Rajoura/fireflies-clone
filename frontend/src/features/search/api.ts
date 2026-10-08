import { unwrap, type Page, type SearchHit, type SearchParams } from "@/lib/api";
import { api } from "@/lib/api/client";

/** Transcript hits across every meeting, flat and in relevance order. */
export function searchTranscripts(
  query: SearchParams,
  signal?: AbortSignal,
): Promise<Page<SearchHit>> {
  return unwrap(api.GET("/api/v1/search", { params: { query }, signal }));
}
