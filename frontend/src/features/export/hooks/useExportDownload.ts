"use client";

import { useCallback } from "react";

import { downloadUrl } from "@/lib/utils/download";

import { exportUrl, type ExportRequest } from "../api";

/** Starts the browser download of one meeting's export; the server names the file. */
export function useExportDownload(meetingId: number) {
  return useCallback(
    (request: ExportRequest) => downloadUrl(exportUrl(meetingId, request)),
    [meetingId],
  );
}
