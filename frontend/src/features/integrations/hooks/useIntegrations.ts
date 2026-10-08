"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { qk, type IntegrationListParams } from "@/lib/api";

import { fetchIntegrationCategories, fetchIntegrations } from "../api";

/** Keeps the previous grid on screen while a new filter loads, so the cards don't flash. */
export function useIntegrations(params: IntegrationListParams) {
  return useQuery({
    queryKey: qk.integrations.list(params),
    queryFn: ({ signal }) => fetchIntegrations(params, signal),
    placeholderData: keepPreviousData,
    select: (page) => page.items,
  });
}

/** The catalogue is static per deploy, so the category list never needs refetching. */
export function useIntegrationCategories() {
  return useQuery({
    queryKey: qk.integrations.categories(),
    queryFn: ({ signal }) => fetchIntegrationCategories(signal),
    staleTime: Infinity,
    select: (page) => page.items,
  });
}
