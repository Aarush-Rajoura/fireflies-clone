import { describe, expect, it } from "vitest";

import type { TranscriptPreview } from "@/lib/api";

import {
  buildMeetingCreate,
  participantsFromPreview,
  sourceForTab,
  toLocalInputValue,
  type MeetingDetails,
} from "./payload";

const preview: TranscriptPreview = {
  format: "text",
  timings_estimated: false,
  speakers: ["Priya Raman", "Daniel Okafor", " priya raman ", ""],
  segment_count: 2,
  duration_ms: 23_000,
  warnings: [],
  segments: [
    { speaker: "Priya Raman", start_ms: 0, end_ms: 11_000, text: "Morning all." },
    { speaker: "Daniel Okafor", start_ms: 11_000, end_ms: 23_000, text: "Morning!" },
  ],
};

const details: MeetingDetails = {
  title: "  Weekly sync  ",
  startedAt: "2026-10-08T09:30",
  participants: ["Priya Raman", " ", " Daniel Okafor "],
  channelId: 4,
};

describe("participantsFromPreview", () => {
  it("prefills from speakers, de-duplicated case-insensitively in order", () => {
    expect(participantsFromPreview(preview)).toEqual(["Priya Raman", "Daniel Okafor"]);
  });

  it("is empty without a preview", () => {
    expect(participantsFromPreview(null)).toEqual([]);
  });
});

describe("buildMeetingCreate", () => {
  it("passes the previewed segments through untouched with the tab's source", () => {
    const body = buildMeetingCreate(details, "paste", preview);
    expect(body.segments).toBe(preview.segments);
    expect(body.source).toBe("paste");
    expect(body).toMatchObject({
      title: "Weekly sync",
      participants: ["Priya Raman", "Daniel Okafor"],
      channel_id: 4,
    });
  });

  it("converts the local date-time to a UTC ISO string", () => {
    const body = buildMeetingCreate(details, "upload", preview);
    expect(body.started_at).toBe(new Date("2026-10-08T09:30").toISOString());
  });

  it("sends segments: null and no date for a bare form", () => {
    const body = buildMeetingCreate({ ...details, startedAt: "", channelId: null }, "manual", null);
    expect(body).toMatchObject({
      segments: null,
      source: "manual",
      started_at: null,
      channel_id: null,
    });
  });
});

describe("sourceForTab", () => {
  it("maps each tab to the backend's source", () => {
    expect(sourceForTab("upload")).toBe("upload");
    expect(sourceForTab("paste")).toBe("paste");
    expect(sourceForTab("form")).toBe("manual");
  });
});

describe("toLocalInputValue", () => {
  it("formats as a datetime-local value", () => {
    expect(toLocalInputValue(new Date(2026, 0, 5, 7, 4))).toBe("2026-01-05T07:04");
  });
});
