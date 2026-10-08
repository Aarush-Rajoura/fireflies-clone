"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { qk, type TaskListParams } from "@/lib/api";

import { fetchTasks } from "../api";

/** Keeps the previous list on screen while a new scope or filter loads, so it doesn't flash. */
export function useTasks(params: TaskListParams) {
  return useQuery({
    queryKey: qk.tasks.list(params),
    queryFn: ({ signal }) => fetchTasks(params, signal),
    placeholderData: keepPreviousData,
  });
}
