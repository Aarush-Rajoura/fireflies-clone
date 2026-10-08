import {
  unwrap,
  type Integration,
  type IntegrationCategoryInfo,
  type IntegrationListParams,
  type Page,
} from "@/lib/api";
import { api } from "@/lib/api/client";

export function fetchIntegrations(
  query: IntegrationListParams,
  signal?: AbortSignal,
): Promise<Page<Integration>> {
  return unwrap(api.GET("/api/v1/integrations", { params: { query }, signal }));
}

export function fetchIntegrationCategories(
  signal?: AbortSignal,
): Promise<Page<IntegrationCategoryInfo>> {
  return unwrap(
    api.GET("/api/v1/integrations/categories", { params: { query: { page_size: 100 } }, signal }),
  );
}

/** Simulated: the backend only records the connection; nothing reaches the vendor. */
export function connectIntegration(key: string): Promise<Integration> {
  return unwrap(api.PUT("/api/v1/integrations/{key}/connection", { params: { path: { key } } }));
}

export function disconnectIntegration(key: string): Promise<void> {
  return unwrap(
    api.DELETE("/api/v1/integrations/{key}/connection", { params: { path: { key } } }),
  ) as Promise<void>;
}
