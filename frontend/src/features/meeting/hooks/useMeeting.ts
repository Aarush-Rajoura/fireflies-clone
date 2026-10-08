"use client";

import { useQuery } from "@tanstack/react-query";

import { ApiError, qk } from "@/lib/api";

import { getMeeting } from "../api";

export function useMeeting(id: number) {
  return useQuery({
    queryKey: qk.meetings.detail(id),
    queryFn: ({ signal }) => getMeeting(id, signal),
  });
}

/** 410: soft-deleted, so the page offers Restore instead of an error. */
export function isMeetingDeleted(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 410;
}

export function isMeetingNotFound(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 404;
}
