import { describe, expect, it } from "vitest";

import {
  captureBody,
  defaultSchedule,
  scheduleBody,
  toInstant,
  validateCapture,
  validateSchedule,
  type ScheduleForm,
} from "./meeting-forms";

const NOW = new Date(2026, 9, 8, 12, 10); // local time, like the inputs

const form = (over: Partial<ScheduleForm> = {}): ScheduleForm => ({
  title: "Design review",
  date: "2026-10-09",
  time: "10:30",
  meetingUrl: "",
  autoJoin: true,
  ...over,
});

describe("toInstant", () => {
  it("reads the date and time inputs in local time", () => {
    expect(toInstant("2026-10-09", "10:30")?.getTime()).toBe(
      new Date(2026, 9, 9, 10, 30).getTime(),
    );
  });

  it.each([
    ["", "10:30"],
    ["2026-10-09", ""],
    ["09/10/2026", "10:30"],
    ["2026-13-45", "10:30"],
  ])("rejects %j %j", (date, time) => {
    expect(toInstant(date, time)).toBeNull();
  });
});

describe("validateSchedule", () => {
  it("accepts a named future meeting with an optional link", () => {
    expect(validateSchedule(form(), NOW)).toEqual({});
    expect(validateSchedule(form({ meetingUrl: "https://zoom.us/j/1" }), NOW)).toEqual({});
  });

  it("requires a name, a future time and a full link when one is given", () => {
    expect(
      validateSchedule(
        form({ title: "  ", date: "2026-10-08", time: "12:10", meetingUrl: "zoom.us/j/1" }),
        NOW,
      ),
    ).toEqual({
      title: "Give the meeting a name",
      date: "Pick a time in the future",
      meetingUrl: "Use a full link starting with https://",
    });
    expect(validateSchedule(form({ time: "" }), NOW).date).toBe("Pick a date and time");
  });
});

describe("validateCapture", () => {
  it("needs a name and a link", () => {
    expect(validateCapture({ title: "", meetingUrl: "", language: "en" })).toEqual({
      title: "Give the meeting a name",
      meetingUrl: "Paste the meeting link",
    });
    expect(
      validateCapture({ title: "Call", meetingUrl: "https://meet.google.com/x", language: "en" }),
    ).toEqual({});
  });
});

describe("request bodies", () => {
  it("builds a scheduled meeting with a UTC start and no empty link", () => {
    const body = scheduleBody(form({ title: "  Design review ", meetingUrl: " " }));
    expect(body).toEqual({
      title: "Design review",
      status: "scheduled",
      started_at: new Date(2026, 9, 9, 10, 30).toISOString(),
      meeting_url: null,
      auto_join: true,
      language: "en",
      source: "manual",
    });
  });

  it("builds a live capture", () => {
    expect(
      captureBody({ title: " Call ", meetingUrl: " https://zoom.us/j/1 ", language: "es" }),
    ).toEqual({
      title: "Call",
      status: "live",
      meeting_url: "https://zoom.us/j/1",
      language: "es",
      auto_join: false,
      source: "manual",
    });
  });
});

describe("defaultSchedule", () => {
  it("starts on a whole hour at least 30 minutes ahead, valid as-is apart from the name", () => {
    const d = defaultSchedule(NOW);
    expect([d.date, d.time]).toEqual(["2026-10-08", "13:00"]);
    expect(validateSchedule({ ...d, title: "x" }, NOW)).toEqual({});
    expect(defaultSchedule(new Date(2026, 9, 8, 12, 40)).time).toBe("14:00");
  });
});
